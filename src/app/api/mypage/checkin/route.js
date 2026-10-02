import { NextResponse } from "next/server";
import { jstDateString } from "../../_lib/server";
import { requireMypageSession, forbidUnlessOwner, sbFetch } from "../../_lib/mypage-auth";

// 来院受付（QR）。本人の今日の確認済み予約のうち最も早いものを「受付中」にする。
export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;

  try {
    const rows = await sbFetch(headers,
      `bookings?customer_id=eq.${encodeURIComponent(customer.id)}&booking_date=eq.${jstDateString()}` +
      `&status=eq.confirmed&order=booking_time.asc&limit=1&select=id,customer_id,store_id`);
    const booking = Array.isArray(rows) ? rows[0] : null;
    if (!booking) return NextResponse.json({ error: "本日の予約が見つかりません" }, { status: 404 });

    const forbidden = forbidUnlessOwner(booking.customer_id, customer);
    if (forbidden) return forbidden;

    await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(booking.id)}&customer_id=eq.${encodeURIComponent(customer.id)}`, {
      method: "PATCH", body: JSON.stringify({ status: "received" }),
    });
    await sbFetch(headers, "rpc/assign_customer_number", {
      method: "POST", body: JSON.stringify({ p_customer_id: customer.id, p_store_id: booking.store_id }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mypage-checkin]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
