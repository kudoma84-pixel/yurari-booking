import { NextResponse } from "next/server";
import { checkCronSecret } from "../_lib/server";
import { runFollowups } from "../_lib/followup";

// ビルド時に実行されないよう、必ずリクエストごとに動かす
export const dynamic = "force-dynamic";

// 来院日を起点にしたフォロー配信。/api/remind?type=today からも毎朝呼ばれる。
// FOLLOWUP_ENABLED=1 になるまでは送信せず、対象者の一覧だけを返す。
export async function GET(request) {
  const auth = checkCronSecret(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runFollowups());
  } catch (e) {
    console.error("[followup] 実行エラー", e);
    return NextResponse.json({ error: "フォロー配信の実行に失敗しました" }, { status: 500 });
  }
}
