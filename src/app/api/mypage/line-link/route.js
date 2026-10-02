import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

// LINE連携。クライアントから LINE ユーザーIDは受け取らず、LIFF のアクセストークンを
// LINE の API で検証して得たユーザーIDだけを、セッションの本人の顧客に保存する。
// （ユーザーIDを直接受け取ると、他人のLINEユーザーIDを自分に紐づけてメッセージを読めてしまうため）

// 発行元として認めるチャネル：マイページのLIFFアプリのチャネル（LIFF ID の "-" より前）と LINEログインのチャネル
function allowedChannelIds() {
  const ids = [];
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE;
  if (liffId && liffId.includes("-")) ids.push(liffId.split("-")[0]);
  if (process.env.LINE_CLIENT_ID) ids.push(process.env.LINE_CLIENT_ID);
  return ids;
}

export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;

  const allowed = allowedChannelIds();
  if (allowed.length === 0) {
    console.error("[mypage-line-link] NEXT_PUBLIC_LIFF_ID_MYPAGE / LINE_CLIENT_ID が未設定です");
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
    // 1) トークンが有効で、こちらのチャネルが発行したものか
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(accessToken));
    const verify = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !(verify.expires_in > 0) || !allowed.includes(String(verify.client_id))) {
      console.error("[mypage-line-link] アクセストークンの検証に失敗しました", verifyRes.status);
      return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
    }
    // 2) トークンの持ち主のユーザーID
    const profileRes = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: "Bearer " + accessToken } });
    const profile = await profileRes.json().catch(() => ({}));
    if (!profileRes.ok || !profile.userId) {
      console.error("[mypage-line-link] プロフィールの取得に失敗しました", profileRes.status);
      return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
    }

    await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer.id)}`, {
      method: "PATCH", body: JSON.stringify({ line_user_id: profile.userId, notification_method: "line" }),
    });
    return NextResponse.json({ ok: true, line_user_id: profile.userId, notification_method: "line" });
  } catch (e) {
    console.error("[mypage-line-link]", e.message);
    return NextResponse.json({ error: "LINE連携に失敗しました" }, { status: 500 });
  }
}
