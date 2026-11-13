// 受付で見せる「LINE連携QR」用の合鍵。
// 顧客IDと有効期限（30分）を HMAC で署名する。マイページのセッション用トークンとは
// 署名キーを分けているので、互いに流用できない（QRを見られてもマイページには入れない）。
import crypto from "crypto";

export const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;

function linkSecret() {
  const base = process.env.NEXTAUTH_SECRET;
  return base ? base + ":line-link-v1" : null;
}

const sign = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export function createLinkToken(customerId) {
  const secret = linkSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ cid: String(customerId), exp: Date.now() + LINK_TOKEN_TTL_MS, p: "line-link" })).toString("base64url");
  return payload + "." + sign(payload, secret);
}

// 正しければ { cid, exp }、不正・期限切れなら null
export function verifyLinkToken(token) {
  const secret = linkSecret();
  if (!secret || !token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (v.p !== "line-link" || !v.cid || typeof v.exp !== "number" || Date.now() > v.exp) return null;
    return { cid: v.cid, exp: v.exp };
  } catch {
    return null;
  }
}

// 管理画面のログインと同じ院・パスワードの組み合わせか（管理画面の認証と同じ水準）。
// 環境変数 ADMIN_PASSWORDS（{"minamiurawa":"…","toda":"…"} の JSON）があればそちらを使う。
export function checkAdminStore(store, password) {
  let table = { minamiurawa: "yurari-minami", toda: "yurari-toda" };
  if (process.env.ADMIN_PASSWORDS) {
    try { table = JSON.parse(process.env.ADMIN_PASSWORDS); } catch { /* 既定値のまま */ }
  }
  return !!store && typeof password === "string" && table[store] === password;
}
