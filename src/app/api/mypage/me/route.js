import { NextResponse } from "next/server";
import { requireMypageSession, pickCustomerFields } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// ログイン中の顧客本人の情報だけを返す。セッションが無効なら 401。
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  return NextResponse.json({ customer: pickCustomerFields(session.customer) }, { headers: { "Cache-Control": "no-store" } });
}
