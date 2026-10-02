import { NextResponse } from "next/server";
import { jstDateString } from "../../../_lib/server";
import { requireMypageSession, forbidUnlessOwner, sbFetch } from "../../../_lib/mypage-auth";

// 予約のキャンセル。予約が本人のものであることをサーバー側で確認してから更新する。
export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;

  let bookingId;
  try {
    ({ bookingId } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!bookingId || typeof bookingId !== "string") {
    return NextResponse.json({ error: "bookingId は必須です" }, { status: 400 });
  }

  try {
    const rows = await sbFetch(headers,
      `bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,customer_id,store_id,status,booking_date,booking_time,course_name`);
    const booking = Array.isArray(rows) ? rows[0] : null;
    if (!booking) return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });

    // 本人の予約か（Cookieの顧客IDと予約の顧客IDが一致するか）
    const forbidden = forbidUnlessOwner(booking.customer_id, customer);
    if (forbidden) return forbidden;

    // 画面でキャンセルボタンを出す条件（今日以降・キャンセル済み/会計済みでない）と同じ
    if (booking.status === "cancelled" || booking.status === "completed" || booking.booking_date < jstDateString()) {
      return NextResponse.json({ error: "この予約はキャンセルできません" }, { status: 409 });
    }

    await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(booking.id)}&customer_id=eq.${encodeURIComponent(customer.id)}`, {
      method: "PATCH", body: JSON.stringify({ status: "cancelled" }),
    });

    // 管理画面への通知（失敗してもキャンセル自体は成立しているので、ログだけ残す）
    try {
      await sbFetch(headers, "admin_notifications", {
        method: "POST",
        body: JSON.stringify({
          store_id: booking.store_id,
          type: "cancel",
          title: "キャンセル",
          body: (customer.name || "") + "様 " + booking.booking_date + " " + booking.booking_time + " " + booking.course_name,
          booking_id: booking.id,
          customer_id: customer.id,
        }),
      });
    } catch (e) {
      console.error("[mypage-cancel] 管理画面への通知に失敗しました:", e.message);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mypage-cancel]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
