import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch } from "../../_lib/booking-auth";

// LIFF 初期化の診断ログを auth_error_logs に記録する（従来はブラウザから直接 INSERT していた）。
// 認証情報は送られてこない前提だが、念のため長さを制限する。
const MAX_DETAIL = 4000;

export async function POST(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  let detail;
  try {
    ({ detail } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof detail !== "string" || !detail || detail.length > MAX_DETAIL) {
    return NextResponse.json({ error: "detail が不正です" }, { status: 400 });
  }
  try {
    await sbFetch(s.headers, "auth_error_logs", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        error_code: "LIFF_DEBUG",
        detail,
        user_agent: (request.headers.get("user-agent") || "").slice(0, 500),
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[booking-form/liff-log]", e.message);
    return NextResponse.json({ error: "記録に失敗しました" }, { status: 500 });
  }
}
