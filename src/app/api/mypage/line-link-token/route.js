import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../../_lib/server";
import { SESSION_COOKIE, sessionCookieOptions, serviceRoleHeaders, createSessionToken } from "../../_lib/mypage-auth";
import { verifyLinkToken } from "../../_lib/line-link-token";

export const dynamic = "force-dynamic";

// 受付の「LINE連携QR」を読み取ったお客様のLINEを、そのお客様の登録に結びつける。
//   confirm=false … 合鍵とLINEを確かめて、お名前（確認用）だけを返す
//   confirm=true  … 結びつけて、連絡方法をLINEにし、マイページにもログインさせる
// LINEユーザーIDはクライアントから受け取らず、アクセストークンをLINEで検証して得る。
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
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const { token, accessToken, confirm } = body || {};

  const link = verifyLinkToken(token);
  if (!link) {
    return NextResponse.json({ error: "このQRコードは有効期限が切れています。受付で新しいQRコードを表示してもらってください。", code: "expired" }, { status: 410 });
  }
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
  }

  try {
    const [verifyRes, profileRes] = await Promise.all([
      fetch("https://api.line.me/oauth2/v2.1/verify?access_token=" + encodeURIComponent(accessToken), { cache: "no-store" }),
      fetch("https://api.line.me/v2/profile", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" }),
    ]);
    const [verify, profile] = await Promise.all([verifyRes.json().catch(() => ({})), profileRes.json().catch(() => ({}))]);
    if (!verifyRes.ok || !(verify.expires_in > 0) || !allowed.includes(String(verify.client_id)) || !profileRes.ok || !profile.userId) {
      return NextResponse.json({ error: "LINEの認証に失敗しました" }, { status: 401 });
    }
    const uid = profile.userId;

    const cRes = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(link.cid)}&is_deleted=not.is.true&select=id,name,line_user_id`,
      { headers, cache: "no-store" }
    );
    const rows = cRes.ok ? await cRes.json() : [];
    const c = Array.isArray(rows) ? rows[0] : null;
    if (!c) return NextResponse.json({ error: "ご登録が見つかりません。受付にお声がけください。" }, { status: 404 });

    if (c.line_user_id && c.line_user_id !== uid) {
      return NextResponse.json({ error: "このご登録は、すでに別のLINEアカウントと連携されています。受付にお声がけください。", code: "other_line" }, { status: 409 });
    }
    // このLINEが別のお客様に連携済みなら結びつけない（ご家族で1つのLINEを使っている場合など）
    const oRes = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${encodeURIComponent(uid)}&id=neq.${encodeURIComponent(c.id)}&is_deleted=not.is.true&select=id&limit=1`,
      { headers, cache: "no-store" }
    );
    const others = oRes.ok ? await oRes.json() : [];
    if (Array.isArray(others) && others.length > 0) {
      return NextResponse.json({ error: "このLINEアカウントは、すでに別のお客様のご登録と連携されています。受付にお声がけください。", code: "line_used" }, { status: 409 });
    }

    const already = c.line_user_id === uid;
    if (!confirm) {
      return NextResponse.json({ ok: true, name: c.name || "", already_linked: already });
    }

    if (!already) {
      // 空のときだけ更新する（同時に別のLINEで連携された場合に上書きしない）
      const up = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(c.id)}&line_user_id=is.null`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ line_user_id: uid, notification_method: "line" }), cache: "no-store" }
      );
      const updated = up.ok ? await up.json() : [];
      if (!Array.isArray(updated) || updated.length !== 1) {
        return NextResponse.json({ error: "連携できませんでした。受付にお声がけください。" }, { status: 409 });
      }
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(c.id)}`, {
        method: "PATCH", headers, body: JSON.stringify({ notification_method: "line" }), cache: "no-store",
      }).catch(() => {});
    }
    console.log("[line-link-token] 受付QRでLINEを連携しました", JSON.stringify({ customer_id: c.id, already }));

    const session = createSessionToken(c.id);
    const response = NextResponse.json({ ok: true, linked: true, name: c.name || "" });
    if (session) response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
    return response;
  } catch (e) {
    console.error("[line-link-token]", e.message);
    return NextResponse.json({ error: "エラーが発生しました。受付にお声がけください。" }, { status: 500 });
  }
}
