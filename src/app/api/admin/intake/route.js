import { NextResponse } from "next/server";
import { serviceRoleHeaders, sbFetch } from "../../_lib/mypage-auth";
import { checkAdminStore } from "../../_lib/line-link-token";
import { fetchAllRowsServer, isUuid } from "../../_lib/intake";

export const dynamic = "force-dynamic";

// 管理画面の顧客詳細「📝 問診票」：その方の問診票一覧（新しい順）。
// パスワードは LINE連携QR と同じ扱い（管理画面の院・パスワードを毎回確認する）。
// 1,000件を超えても欠けないよう、全件の分割取得（fetchAllRowsServer）で取る。
export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers) return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { customer_id, store, password } = body || {};
  if (!checkAdminStore(store, password)) {
    return NextResponse.json({ error: "管理画面のパスワードを確認してください" }, { status: 401 });
  }
  if (!isUuid(customer_id)) return NextResponse.json({ error: "customer_id が正しくありません" }, { status: 400 });

  try {
    const [forms, cust] = await Promise.all([
      fetchAllRowsServer(headers,
        `intake_forms?customer_id=eq.${encodeURIComponent(customer_id)}&select=*&order=created_at.desc,id.desc`, "admin-intake"),
      sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer_id)}&select=id,customer_number,name,kana,birthday,gender,tel,tel2,email,zipcode,address`),
    ]);
    if (!forms) return NextResponse.json({ error: "問診票を読み込めませんでした" }, { status: 500 });
    return NextResponse.json({ forms, customer: Array.isArray(cust) ? cust[0] || null : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/intake]", e.message);
    return NextResponse.json({ error: "問診票を読み込めませんでした" }, { status: 500 });
  }
}
