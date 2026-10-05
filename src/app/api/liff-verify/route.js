import { NextResponse } from "next/server";
import { LINE_COOKIE, lineCookieOptions, createLineToken } from "../_lib/booking-auth";

// LIFF の IDトークンを LINE の検証エンドポイントで検証し、LINEユーザーIDを返す。
// クライアントから送られたユーザーIDは信用せず、必ずここで検証した sub だけを使うこと。
export async function POST(request) {
  let idToken;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken は必須です" }, { status: 400 });
  }

  const clientId = process.env.LINE_CLIENT_ID;
  if (!clientId) {
    console.error("[liff-verify] LINE_CLIENT_ID が未設定です");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sub) {
      console.error("[liff-verify] IDトークン検証失敗", res.status, data?.error, data?.error_description);
      return NextResponse.json({ error: "invalid id token" }, { status: 401 });
    }
    const response = NextResponse.json({ lineUserId: data.sub, displayName: data.name || "", picture: data.picture || "" });
    // 予約フォームのAPIがクライアント送信のIDではなく検証済みのIDを使えるよう、署名付きCookieに入れる
    const token = createLineToken(data.sub);
    if (token) response.cookies.set(LINE_COOKIE, token, lineCookieOptions);
    else console.error("[liff-verify] NEXTAUTH_SECRET が未設定のため検証済みCookieを発行できません");
    return response;
  } catch (e) {
    console.error("[liff-verify] 検証エラー", e);
    return NextResponse.json({ error: "invalid id token" }, { status: 401 });
  }
}
