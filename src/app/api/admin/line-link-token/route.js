import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../../_lib/server";
import { serviceRoleHeaders } from "../../_lib/mypage-auth";
import { createLinkToken, checkAdminStore, LINK_TOKEN_TTL_MS } from "../../_lib/line-link-token";

export const dynamic = "force-dynamic";

// 受付の管理画面から呼ぶ。指定したお客様専用の「LINE連携QR」の URL を発行する（30分有効）。
export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET || !process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE) {
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { customer_id, store, password } = body || {};
  if (!checkAdminStore(store, password)) {
    return NextResponse.json({ error: "管理画面のパスワードを確認してください" }, { status: 401 });
  }
  if (!customer_id) return NextResponse.json({ error: "customer_id は必須です" }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customer_id)}&is_deleted=not.is.true&select=id,name,line_user_id`,
    { headers, cache: "no-store" }
  );
  const rows = res.ok ? await res.json() : [];
  const c = Array.isArray(rows) ? rows[0] : null;
  if (!c) return NextResponse.json({ error: "お客様が見つかりません" }, { status: 404 });

  const token = createLinkToken(c.id);
  if (!token) return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  const url = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE}/link?t=${encodeURIComponent(token)}`;
  return NextResponse.json({ url, expires_at: Date.now() + LINK_TOKEN_TTL_MS, already_linked: !!c.line_user_id });
}
