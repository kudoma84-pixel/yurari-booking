import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "../../_lib/mypage-auth";

// マイページのログアウト。HttpOnly Cookie はブラウザのJSから消せないため、サーバーで削除する。
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
