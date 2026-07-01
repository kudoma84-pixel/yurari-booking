import { NextResponse } from "next/server";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const today = new Date(new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }));
  const targetDate = new Date(today);

  if (type === "tomorrow") {
    targetDate.setDate(today.getDate() + 1);
  }

  const dateStr = targetDate.getFullYear() + "-" +
    String(targetDate.getMonth() + 1).padStart(2, "0") + "-" +
    String(targetDate.getDate()).padStart(2, "0");

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };

  const res = await fetch(
    SUPABASE_URL + "/rest/v1/bookings?booking_date=eq." + dateStr + "&status=in.(confirmed,received,treatment_done)&select=*,customers(name,line_user_id,email,notification_method)",
    { headers }
  );
  const bookings = await res.json();

  let sent = 0;
  for (const booking of bookings) {
    const customer = booking.customers;
    if (!customer) continue;

    const timeLabel = type === "tomorrow" ? "明日" : "本日";
    const storeName = booking.store_id === "toda" ? "戸田院" : "南浦和本院";
    const message = timeLabel + " " + booking.booking_time + "より「" + booking.course_name + "」のご予約があります。\n担当：" + booking.staff_name + "\n店舗：" + storeName + "\n\nご来院をお待ちしております。\n整体院 癒楽里";
    const message = timeLabel + " " + booking.booking_time + "より「" + booking.course_name + "」のご予約があります。\n担当：" + booking.staff_name + "\n店舗：整体院 癒楽里 " + storeName + "\n\nご来院をお待ちしております。";

    // プッシュ通知（通知方法に関わらず送信）
    await fetch(process.env.NEXTAUTH_URL + "/api/push-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: booking.customer_id,
        title: "整体院 癒楽里",
        body: (type === "tomorrow" ? "明日" : "本日") + " " + booking.booking_time + "より「" + booking.course_name + "」のご予約があります。",
        url: "/mypage",
      }),
    });

    if (customer.notification_method === "line" && customer.line_user_id) {
      await fetch("https://api.line.me/v2/bot/message/push", {
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
      sent++;
    } else if (customer.notification_method === "email" && customer.email) {
      await fetch(process.env.NEXTAUTH_URL + "/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: customer.email,
          subject: timeLabel + "のご予約リマインド｜整体院 癒楽里",
          html: "<div style='font-family:sans-serif;padding:20px;'><p>" + customer.name + " 様</p><p>" + message.replace(/\n/g, "<br>") + "</p></div>",
        }),
      });
      sent++;
    }
  }

  return NextResponse.json({ success: true, date: dateStr, sent });
}
