import { NextResponse } from "next/server";
import { checkInternalSecret, sendPushToCustomer } from "../_lib/server";

// このAPIはサーバー内部からのみ呼ばれる想定（リマインド配信は関数を直接呼ぶ形に変更済み）。
// 外部から任意の顧客へ偽の通知を送れないよう、内部シークレット必須の fail-closed にしている。
export async function POST(request) {
  const auth = checkInternalSecret(request);
  if (!auth.ok) {
    console.warn("[push-send] 拒否:", auth.reason);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { customer_id, title, body, url } = await request.json();
    if (!customer_id) {
      return NextResponse.json({ error: "customer_id は必須です" }, { status: 400 });
    }
    // URLは自サイト内のパスのみ許可（外部フィッシングURLへの誘導を防ぐ）
    const safeUrl = typeof url === "string" && url.startsWith("/") ? url : "/mypage";
    const result = await sendPushToCustomer({ customer_id, title, body, url: safeUrl });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[push-send] エラー", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
