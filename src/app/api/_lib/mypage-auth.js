// マイページのログイン・セッション用のサーバー側ユーティリティ。
// server.js の SUPABASE_KEY は「サービスロールキー → 公開キー」とフォールバックするため、ここでは使わない。
// サービスロールキーが無ければ処理を止める（fail-closed）。
import crypto from "crypto";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "./server";

export const SESSION_COOKIE = "yurari_mypage_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 秒（7日）

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

// サービスロールキーのヘッダー。未設定なら null を返すので、呼び出し側で 500 にすること。
export function serviceRoleHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}

function sessionSecret() {
  return process.env.NEXTAUTH_SECRET || null;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function sign(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

// 顧客IDと有効期限を HMAC で署名した値を作る。署名キー未設定なら null。
export function createSessionToken(customerId) {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = b64url(JSON.stringify({ cid: String(customerId), exp: Date.now() + SESSION_MAX_AGE * 1000 }));
  return payload + "." + sign(payload, secret);
}

// 署名と期限を検証し、正しければ顧客IDを返す。不正・期限切れ・署名キー未設定なら null。
export function verifySessionToken(token) {
  const secret = sessionSecret();
  if (!secret || !token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { cid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!cid || typeof exp !== "number" || Date.now() > exp) return null;
    return cid;
  } catch {
    return null;
  }
}

// ── 総当たり対策（同一IPから20回/10分） ─────────────────
// 複数のサーバーインスタンスで共有するため mypage_login_attempts テーブルで数える。
// IPはそのまま保存せず、NEXTAUTH_SECRET で HMAC したハッシュだけを保存する。
// テーブル未作成などでDBが使えない場合は、インスタンス内メモリで数える（制限を外さない）。
// 携帯キャリアは多数の利用者が同じIPを共有するため、20回まで許容する
export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export function clientIp(request) {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

function ipHash(ip) {
  return crypto.createHmac("sha256", sessionSecret() || "").update("mypage-login:" + ip).digest("hex");
}

const memoryAttempts = new Map(); // ipHash -> 試行時刻の配列

function memoryRateLimited(hash) {
  const now = Date.now();
  const list = (memoryAttempts.get(hash) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  list.push(now);
  memoryAttempts.set(hash, list);
  if (memoryAttempts.size > 5000) {
    for (const [k, v] of memoryAttempts) {
      if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) memoryAttempts.delete(k);
    }
  }
  return list.length > RATE_LIMIT_MAX;
}

// 今回の試行を記録し、上限を超えていれば true を返す。
export async function recordAttemptAndCheckLimit(request, headers) {
  const hash = ipHash(clientIp(request));
  try {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/mypage_login_attempts`, {
      method: "POST", headers, body: JSON.stringify({ ip_hash: hash }),
    });
    if (!ins.ok) throw new Error(`insert ${ins.status}`);
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mypage_login_attempts?ip_hash=eq.${hash}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${RATE_LIMIT_MAX + 1}`,
      { headers }
    );
    if (!res.ok) throw new Error(`select ${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > RATE_LIMIT_MAX;
  } catch (e) {
    console.error("[mypage-login] 試行回数テーブルが使えないため、メモリで制限します:", e.message);
    return memoryRateLimited(hash);
  }
}

// 判定に使わなくなった古い試行記録（10分より前）を削除する。失敗しても判定には影響しない。
export async function deleteOldAttempts(headers) {
  const old = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mypage_login_attempts?created_at=lt.${encodeURIComponent(old)}`, { method: "DELETE", headers });
    if (!res.ok) console.error("[mypage-login] 古い試行記録の削除に失敗しました:", res.status);
  } catch (e) {
    console.error("[mypage-login] 古い試行記録の削除に失敗しました:", e.message);
  }
}

// ── マイページAPI共通：セッション検証 ─────────────────
// Cookie のセッションを検証し、本人の顧客レコードを取得する。
// 戻り値が { error } ならそのまま return すること（500: 設定不備 / 401: 未ログイン・無効）。
// 操作対象の顧客IDは必ずここで得た customer.id を使い、クライアントから渡された顧客IDは使わない。
export async function requireMypageSession(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[mypage] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return { error: NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 }) };
  }
  const customerId = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!customerId) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&select=*`, { headers });
  if (!res.ok) {
    console.error("[mypage] 顧客情報の取得に失敗しました:", res.status);
    return { error: NextResponse.json({ error: "エラーが発生しました" }, { status: 500 }) };
  }
  const rows = await res.json();
  const customer = Array.isArray(rows) ? rows[0] : null;
  // 削除済み（統合された側など）の顧客のセッションは無効として扱う
  if (!customer || customer.is_deleted === true) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { headers, customer };
}

// 操作対象のレコードがセッションの本人のものか検証する。違えば 403 のレスポンスを返す（一致なら null）。
export function forbidUnlessOwner(rowCustomerId, customer) {
  if (rowCustomerId && String(rowCustomerId) === String(customer.id)) return null;
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

// サービスロールキーで Supabase REST を呼ぶ。失敗時は例外を投げる（本文はログに出さない）。
export async function sbFetch(headers, path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.prefer ? { Prefer: init.prefer } : {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${init.method || "GET"} ${path.split("?")[0]} ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// マイページに返す顧客情報（本人分のみ・画面で使う項目だけ）
export const MYPAGE_CUSTOMER_FIELDS = [
  "id", "customer_number", "name", "kana", "tel", "email", "address", "zipcode",
  "preferred_staff_id", "line_user_id", "notification_method", "points",
];

export function pickCustomerFields(row) {
  const out = {};
  for (const k of MYPAGE_CUSTOMER_FIELDS) if (k in row) out[k] = row[k];
  return out;
}
