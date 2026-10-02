import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// ログイン中の本人の予約一覧（新しい順）
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    const rows = await sbFetch(headers,
      `bookings?customer_id=eq.${encodeURIComponent(customer.id)}&order=booking_date.desc` +
      `&select=id,booking_number,booking_date,booking_time,course_name,staff_name,store_id,status`);
    return NextResponse.json({ bookings: Array.isArray(rows) ? rows : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-bookings]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
