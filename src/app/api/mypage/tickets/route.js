import { NextResponse } from "next/server";
import { jstDateString } from "../../_lib/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// 本人が保有する有効な金券（期限の近い順）
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    const rows = await sbFetch(headers,
      `gift_tickets?customer_id=eq.${encodeURIComponent(customer.id)}&status=eq.active&expires_at=gte.${jstDateString()}` +
      `&order=expires_at.asc&select=id,ticket_name,ticket_type,face_value,issued_at,expires_at`);
    return NextResponse.json({ tickets: Array.isArray(rows) ? rows : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-tickets]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
