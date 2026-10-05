// 予約フォーム（/src）用のサーバー側ユーティリティ。
// 予約フォームはログイン前の画面があるため、マイページのような顧客セッションは前提にできない。
// 本人確認の材料は次の3つだけを使い、クライアントから送られた顧客ID・LINEユーザーIDは信用しない。
//   1) マイページのセッションCookie（1-A）
//   2) 検証済みのLINEユーザーID（/api/liff-verify が発行する署名付きCookie、または NextAuth のセッション）
//   3) フォームの電話番号とDBの電話番号の一致
import crypto from "crypto";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SUPABASE_URL } from "./server";
import { SESSION_COOKIE, serviceRoleHeaders, verifySessionToken } from "./mypage-auth";

export { sbFetch } from "./mypage-auth";

// サービスロールキーのヘッダー。未設定なら 500 のレスポンスを返す（公開キーにフォールバックしない）。
export function requireServiceHeaders() {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[booking-form] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return { error: NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 }) };
  }
  return { headers };
}

export const digits = (v) => String(v ?? "").replace(/[^0-9]/g, "");

// ── 検証済みLINEユーザーID ─────────────────────────────
// LIFF の IDトークンを /api/liff-verify で検証したときに発行する署名付きCookie。
// 用途（purpose）を署名に含め、マイページのセッション値と取り違えても通らないようにする。
export const LINE_COOKIE = "yurari_line_verified";
const LINE_COOKIE_MAX_AGE = 24 * 60 * 60; // 秒（1日）
const LINE_PURPOSE = "liff-line-user:";

export const lineCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: LINE_COOKIE_MAX_AGE,
};

function signLine(payload, secret) {
  return crypto.createHmac("sha256", secret).update(LINE_PURPOSE + payload).digest("base64url");
}

export function createLineToken(lineUserId) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !lineUserId) return null;
  const payload = Buffer.from(JSON.stringify({ luid: String(lineUserId), exp: Date.now() + LINE_COOKIE_MAX_AGE * 1000 })).toString("base64url");
  return payload + "." + signLine(payload, secret);
}

function verifyLineToken(token) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(signLine(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { luid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!luid || typeof exp !== "number" || Date.now() > exp) return null;
    return luid;
  } catch {
    return null;
  }
}

// NextAuth（LINEログイン）のセッションから LINEユーザーIDを取り出す。
// 設定は useSecureCookies: true のため Cookie 名は __Secure-next-auth.session-token。
async function nextAuthLineUserId(request) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const cookies = Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value]));
    const token = await getToken({ req: { cookies, headers: {} }, secret, secureCookie: true });
    return token?.lineUserId ? String(token.lineUserId) : null;
  } catch (e) {
    console.error("[booking-form] NextAuth セッションの読み取りに失敗しました:", e.message);
    return null;
  }
}

// サーバー側で検証できたLINEユーザーIDと、その経路（"liff" / "nextauth"）。どちらも無ければ null。
export async function verifiedLine(request) {
  const fromLiff = verifyLineToken(request.cookies.get(LINE_COOKIE)?.value);
  if (fromLiff) return { lineUserId: fromLiff, via: "liff" };
  const fromNextAuth = await nextAuthLineUserId(request);
  if (fromNextAuth) return { lineUserId: fromNextAuth, via: "nextauth" };
  return null;
}

// サーバー側で検証できたLINEユーザーID（LIFF → NextAuth の順）。どちらも無ければ null。
export async function verifiedLineUserId(request) {
  return (await verifiedLine(request))?.lineUserId || null;
}

// ── マイページのセッション ─────────────────────────────
// 有効なマイページのセッションがあれば、その顧客レコード（削除済みは除く）を返す。無ければ null。
export async function mypageCustomer(request, headers) {
  const cid = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!cid) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(cid)}&select=*`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`customers ${res.status}`);
  const rows = await res.json();
  const c = Array.isArray(rows) ? rows[0] : null;
  return c && c.is_deleted !== true ? c : null;
}

// 検証済みLINEユーザーIDに紐づく顧客（削除済みは除く）。0件 → { customer: null }、2件以上 → { multiple: true }
export async function customerByLineUserId(headers, lineUserId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${encodeURIComponent(lineUserId)}&is_deleted=not.is.true&select=*`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`customers ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return { customer: null };
  if (rows.length > 1) return { multiple: true };
  return { customer: rows[0] };
}

// 予約フォームの入力欄に戻す顧客情報（本人確認ができた場合のみ返すこと）
const FORM_CUSTOMER_FIELDS = [
  "id", "name", "kana", "tel", "email", "address", "zipcode", "birthday", "notification_method", "line_user_id",
];

export function pickFormCustomer(row) {
  const out = {};
  for (const k of FORM_CUSTOMER_FIELDS) if (k in row) out[k] = row[k];
  return out;
}

// クエリの値チェック（PostgREST への注入防止。IDや日付以外の記号を通さない）
export const isSafeId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);
export const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
