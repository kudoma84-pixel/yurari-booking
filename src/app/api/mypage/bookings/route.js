import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";
import { canCustomerModify, fetchDeadlineSettings } from "../../_lib/modify-deadline";

export const dynamic = "force-dynamic";

// ログイン中の本人の予約一覧（新しい順）
// can_modify：お客様側で変更・キャンセルできるか（受付締切の判定はサーバーで行い、画面はこれに従う）
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    const rows = await sbFetch(headers,
      `bookings?customer_id=eq.${encodeURIComponent(customer.id)}&order=booking_date.desc` +
      `&select=id,booking_number,booking_date,booking_time,course_name,staff_name,store_id,status,created_at`);
    const list = Array.isArray(rows) ? rows : [];

    // 設定が取れなくても一覧は出す（ボタンは出し、キャンセル・変更のAPI側で判定する）
    let settings = null;
    try {
      settings = await fetchDeadlineSettings(headers, list.map((b) => b.store_id));
    } catch (e) {
      console.error("[mypage-bookings] 受付締切の設定取得に失敗しました:", e.message);
    }
    const now = Date.now();
    const bookings = list.map(({ created_at, ...b }) => ({
      ...b,
      can_modify: settings ? canCustomerModify({ ...b, created_at }, settings[b.store_id], now) : true,
    }));
    return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-bookings]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
