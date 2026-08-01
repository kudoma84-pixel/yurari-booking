// APIルート共通のサーバー側ユーティリティ。
// _ で始まるフォルダは Next.js のルーティング対象外（プライベート）。
import crypto from "crypto";
import webpush from "web-push";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_KEY
  || "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

export const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json",
};

// PostgREST のフィルタ値は必ずこれを通す（記号によるフィルタ注入を防ぐ）
export const q = (v) => encodeURIComponent(String(v ?? ""));

export async function sbSelect(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase GET ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ── 認証 ─────────────────────────────────────────────
// 内部呼び出し専用（ブラウザからは呼ばれない）。未設定なら拒否する fail-closed。
export function checkInternalSecret(request) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return { ok: false, reason: "INTERNAL_API_SECRET が未設定です" };
  const given = request.headers.get("x-internal-secret");
  if (!given || given !== expected) return { ok: false, reason: "内部シークレットが一致しません" };
  return { ok: true };
}

// cron 実行用。CRON_SECRET を設定すると検証が有効になる。
// 未設定でも通すのは、既存のリマインド配信を止めないため（設定後は必須になる）。
export function checkCronSecret(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.warn("[security] CRON_SECRET が未設定のため /api/remind は誰でも実行できます。Vercel の環境変数に設定してください。");
    return { ok: true };
  }
  const auth = request.headers.get("authorization") || "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret");
  if (given !== expected) return { ok: false, reason: "cron シークレットが一致しません" };
  return { ok: true };
}

// LINE Webhook の署名検証。LINE_CHANNEL_SECRET を設定すると有効になる。
export function verifyLineSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    console.warn("[security] LINE_CHANNEL_SECRET が未設定のため Webhook の署名検証をスキップしています。");
    return true;
  }
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── 宛先の実在確認（不特定多数への送信踏み台化を防ぐ） ──────────
export async function isKnownCustomerEmail(email) {
  if (!email || typeof email !== "string") return false;
  const rows = await sbSelect(`customers?email=ilike.${q(email)}&select=id&limit=1`);
  return rows.length > 0;
}

// 顧客登録済み、またはLINEで問い合わせ履歴のあるユーザーのみ許可（未登録者への返信を通すため）
export async function isKnownLineUser(lineUserId) {
  if (!lineUserId || typeof lineUserId !== "string") return false;
  const asCustomer = await sbSelect(`customers?line_user_id=eq.${q(lineUserId)}&select=id&limit=1`);
  if (asCustomer.length > 0) return true;
  const inThread = await sbSelect(`line_messages?line_user_id=eq.${q(lineUserId)}&select=id&limit=1`);
  return inThread.length > 0;
}

// ── 日付（日本時間） ────────────────────────────────
// UTC基準だと JST 0:00〜8:59 が前日になるため、必ずこれを使う。
export function jstDateString(offsetDays = 0) {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setUTCDate(jst.getUTCDate() + offsetDays);
  return jst.toISOString().slice(0, 10);
}

// ── プッシュ通知送信（HTTP経由ではなく直接呼ぶ） ──────────────
let vapidReady = false;
function initVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:info@seitai-yurari.com", pub, priv);
  vapidReady = true;
  return true;
}

export async function sendPushToCustomer({ customer_id, title, body, url }) {
  if (!customer_id) return { sent: 0, failed: 0 };
  if (!initVapid()) {
    console.warn("[push] VAPID鍵が未設定のため送信をスキップしました");
    return { sent: 0, failed: 0 };
  }
  const subscriptions = await sbSelect(`push_subscriptions?customer_id=eq.${q(customer_id)}`);
  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, badge: 1 })
      );
      sent++;
    } catch (e) {
      failed++;
      // 410/404 は購読が失効している。それ以外は握りつぶさずログに残す。
      if (e.statusCode === 410 || e.statusCode === 404) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${q(sub.id)}`, {
          method: "DELETE",
          headers: sbHeaders,
        }).catch(() => {});
      } else {
        console.error("[push] 送信失敗", e.statusCode, e.message);
      }
    }
  }
  return { sent, failed };
}
