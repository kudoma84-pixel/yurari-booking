import { NextResponse } from "next/server";
import { serviceRoleHeaders } from "../../../_lib/mypage-auth";
import { checkAdminStore } from "../../../_lib/line-link-token";
import { createCounterToken, createCustomerToken, fetchCustomer } from "../../../_lib/intake";

export const dynamic = "force-dynamic";

// 受付で問診票を開くための URL を発行する（管理画面のパスワードで確認）。
//   kind=counter  … 初めての方（未登録）。kiosk=false：お客様のスマホ用QR（2時間）／ kiosk=true：受付タブレット（14時間）
//   kind=customer … 登録済みで未記入の方（customer_id 必須・2時間）
export async function POST(request) {
  if (!serviceRoleHeaders() || !process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { kind, customer_id, kiosk, store, password } = body || {};
  if (!checkAdminStore(store, password)) {
    return NextResponse.json({ error: "管理画面のパスワードを確認してください" }, { status: 401 });
  }
  // 管理画面を開いているのと同じ環境（本番／プレビュー）の URL にする
  const origin = new URL(request.url).origin;

  let t;
  if (kind === "customer") {
    const c = await fetchCustomer(serviceRoleHeaders(), customer_id).catch(() => null);
    if (!c) return NextResponse.json({ error: "お客様が見つかりません" }, { status: 404 });
    t = createCustomerToken(c.id, store, !!kiosk);
  } else if (kind === "counter") {
    t = createCounterToken(store, !!kiosk);
  } else {
    return NextResponse.json({ error: "kind が正しくありません" }, { status: 400 });
  }
  if (!t.token) return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  const url = `${origin}/monshin?k=${encodeURIComponent(t.token)}${kiosk ? "&kiosk=1" : ""}`;
  return NextResponse.json({ url, expires_at: t.exp });
}
