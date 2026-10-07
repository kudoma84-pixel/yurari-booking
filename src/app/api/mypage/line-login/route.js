import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../../_lib/server";
import { SESSION_COOKIE, sessionCookieOptions, serviceRoleHeaders, createSessionToken } from "../../_lib/mypage-auth";

// LINEアプリ内（LIFF）で開いたマイページの自動ログイン。
// クライアントからは LINE のアクセストークンだけを受け取り、LINE の API で
//   1) こちらのチャネルが発行した有効なトークンか
//   2) トークンの持ち主のユーザーID
// を確かめてから、そのユーザーIDが紐づいた顧客「1件だけ」にセッションを発行する。
// 紐づいた顧客がいない・複数いる場合はログインさせず、通常のコードログインに任せる。

function allowedChannelIds() {
  const ids = [];
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE;
  if (liffId && liffId.includes("-")) ids.push(liffId.split("-")[0]);
  if (process.env.LINE_CLIENT_ID) ids.push(process.env.LINE_CLIENT_ID);
  return ids;
}

export async function POST(request) {
  const headers = serviceRoleHeaders();
  const allowed = allowedChannelIds();
  if (!headers || !process.env.NEXTAUTH_SECRET || allowed.length === 0) {
    console.error("[mypage-line-login] サーバーの設定が不足しています");
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }

  let accessToken;
  try {
    ({ accessToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ error: "accessToken は必須です" }, { status: 400 });
  }

  try {
    // トークンの検証とプロフィール取得は並行して行う（どちらも満たさなければ失敗）
    const [verifyRes, profileRes] = await Promise.all([
      fetch("https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(accessToken), { cache: "no-store" }),
      fetch("https://api.line.me/v2/profile", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" }),
    ]);
    const [verify, profile] = await Promise.all([
      verifyRes.json().catch(() => ({})),
      profileRes.json().catch(() => ({})),
    ]);
    if (!verifyRes.ok || !(verify.expires_in > 0) || !allowed.includes(String(verify.client_id))) {
      return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
    }
    if (!profileRes.ok || !profile.userId) {
      return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${encodeURIComponent(profile.userId)}&is_deleted=not.is.true&select=id,name,customer_number&limit=2`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`customers ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length !== 1) {
      // 未連携（0件）または重複（2件以上）。コードでログインしてもらう
      return NextResponse.json({ linked: false }, { status: 404 });
    }

    const token = createSessionToken(rows[0].id);
    if (!token) return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
    const response = NextResponse.json({ linked: true, name: rows[0].name || "", customer_number: rows[0].customer_number ?? null });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (e) {
    console.error("[mypage-line-login]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
