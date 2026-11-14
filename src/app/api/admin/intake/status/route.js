import { NextResponse } from "next/server";
import { serviceRoleHeaders } from "../../../_lib/mypage-auth";
import { checkAdminStore } from "../../../_lib/line-link-token";
import { intakeAndVisitStatus, isUuid } from "../../../_lib/intake";

export const dynamic = "force-dynamic";

// カレンダーの予約カード用：表示中の日の customer_id をまとめて受け取り、
//   with_intake … 問診票が1件以上ある顧客ID
//   visited     … 来院実績（会計済・物販のみは除く）がある顧客ID
//   before_start … INTAKE_START_AT より前に登録された顧客ID（紙の問診票の方。「未記入」を出さない）
// を返す。返すのは ID だけ（問診票の中身は返さない）。
export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers) return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { customer_ids, store, password } = body || {};
  if (!checkAdminStore(store, password)) {
    return NextResponse.json({ error: "管理画面のパスワードを確認してください" }, { status: 401 });
  }
  const ids = Array.isArray(customer_ids) ? [...new Set(customer_ids.filter(isUuid))].slice(0, 500) : [];
  try {
    const { withIntake, visited, beforeStart } = await intakeAndVisitStatus(headers, ids);
    return NextResponse.json({ with_intake: [...withIntake], visited: [...visited], before_start: [...beforeStart] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin/intake/status]", e.message);
    return NextResponse.json({ error: "問診票の記入状況を読み込めませんでした" }, { status: 500 });
  }
}
