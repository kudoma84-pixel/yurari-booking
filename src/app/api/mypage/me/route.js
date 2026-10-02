import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../../_lib/server";
import { SESSION_COOKIE, serviceRoleHeaders, verifySessionToken, pickCustomerFields } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// ログイン中の顧客本人の情報だけを返す。セッションが無効なら 401。
export async function GET(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[mypage-me] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }

  const customerId = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!customerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=*`,
    { headers }
  );
  if (!res.ok) {
    console.error("[mypage-me] 顧客情報の取得に失敗しました:", res.status);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ customer: pickCustomerFields(rows[0]) }, { headers: { "Cache-Control": "no-store" } });
}
