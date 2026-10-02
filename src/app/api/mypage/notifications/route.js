import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// 本人宛てのお知らせ一覧（新しい順）
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    const rows = await sbFetch(headers,
      `notifications?customer_id=eq.${encodeURIComponent(customer.id)}&order=created_at.desc&select=id,title,body,is_read,created_at`);
    return NextResponse.json({ notifications: Array.isArray(rows) ? rows : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-notifications]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
