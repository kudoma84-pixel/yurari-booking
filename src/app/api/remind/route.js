import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  SUPABASE_URL,
  sbHeaders,
  sbSelect,
  q,
  checkCronSecret,
  jstDateString,
  sendPushToCustomer,
} from "../_lib/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request) {
  const auth = checkCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const isTomorrow = type === "tomorrow";

  // 日本時間で日付を決める（UTC基準だと 0:00〜8:59 に前日を配信してしまう）
  const dateStr = jstDateString(isTomorrow ? 1 : 0);
  const sentColumn = isTomorrow ? "reminded_tomorrow_at" : "reminded_today_at";

  const baseQuery =
    `bookings?booking_date=eq.${q(dateStr)}` +
    `&status=in.(confirmed,received,treatment_done)` +
    `&select=*,customers(name,line_user_id,email,notification_method)`;

  // 送信済みフラグ列があれば重複配信を防ぐ。無い場合は従来どおり動かす。
  let bookings = [];
  let idempotent = true;
  try {
    bookings = await sbSelect(`${baseQuery}&${sentColumn}=is.null`);
  } catch (e) {
    idempotent = false;
    console.warn(
      `[remind] ${sentColumn} 列が無いため重複防止が無効です。sql/2026-08-security-and-integrity.sql を適用してください。`
    );
    try {
      bookings = await sbSelect(baseQuery);
    } catch (err) {
      console.error("[remind] 予約の取得に失敗", err);
      return NextResponse.json({ error: "予約の取得に失敗しました" }, { status: 500 });
    }
  }

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    const customer = booking.customers;
    if (!customer) continue;

    // 1件の失敗で残り全員への配信が止まらないよう、予約ごとに隔離する
    try {
      const timeLabel = isTomorrow ? "明日" : "本日";
      const storeName = booking.store_id === "toda" ? "戸田院" : "南浦和本院";
      const message =
        timeLabel + " " + booking.booking_time + "より「" + booking.course_name + "」のご予約があります。\n担当：" +
        booking.staff_name + "\n店舗：" + storeName + "\n\nご来院をお待ちしております。\n整体院 癒楽里";

      // プッシュ通知（通知方法に関わらず送信）— HTTP経由ではなく直接呼ぶ
      await sendPushToCustomer({
        customer_id: booking.customer_id,
        title: "整体院 癒楽里",
        body: timeLabel + " " + booking.booking_time + "より「" + booking.course_name + "」のご予約があります。",
        url: "/mypage",
      });

      if (customer.notification_method === "line" && customer.line_user_id) {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            to: customer.line_user_id,
            messages: [{ type: "text", text: message }],
          }),
        });
        if (!res.ok) throw new Error(`LINE ${res.status}: ${await res.text()}`);
        sent++;
      } else if (customer.notification_method === "email" && customer.email) {
        await resend.emails.send({
          from: "癒楽里 <noreply@seitai-yurari.com>",
          to: customer.email,
          subject: timeLabel + "のご予約リマインド｜整体院 癒楽里",
          html:
            "<div style='font-family:sans-serif;padding:20px;'><p>" + customer.name +
            " 様</p><p>" + message.replace(/\n/g, "<br>") + "</p></div>",
        });
        sent++;
      }

      if (idempotent) {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${q(booking.id)}`, {
          method: "PATCH",
          headers: sbHeaders,
          body: JSON.stringify({ [sentColumn]: new Date().toISOString() }),
        }).catch((e) => console.error("[remind] 送信済み記録に失敗", booking.id, e.message));
      }
    } catch (e) {
      failed++;
      console.error("[remind] 配信失敗", booking.id, e.message);
    }
  }

  return NextResponse.json({ success: true, date: dateStr, sent, failed, idempotent });
}
