import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../../_lib/mypage-auth";

// 本人宛ての未読のお知らせをすべて既読にする。対象はセッションの顧客IDで絞る。
export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    await sbFetch(headers, `notifications?customer_id=eq.${encodeURIComponent(customer.id)}&is_read=eq.false`, {
      method: "PATCH", body: JSON.stringify({ is_read: true }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mypage-notifications-read]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
