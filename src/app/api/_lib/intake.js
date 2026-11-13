// デジタル問診票（カウンセリングシート）のサーバー側ユーティリティ。
// 問診票は健康情報を含むため、DBの読み書きは必ずサービスロールキー（serviceRoleHeaders）で行う。
// server.js の sbHeaders は公開キーにフォールバックするので使わないこと。
import crypto from "crypto";
import { SUPABASE_URL } from "./server";
import { sbFetch } from "./mypage-auth";
import { VISIT } from "./followup";

export const digits = (v) => String(v ?? "").replace(/[^0-9]/g, "");
const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export { isUuid };

export const STORE_IDS = ["minamiurawa", "toda"];
export const storeName = (storeId) => (storeId === "toda" ? "戸田院" : "南浦和本院");

// ── 受付トークン ─────────────────────────────────────
// line-link-token.js と同じ方式（HMAC）。署名キーは他の用途と分ける（LINE連携QR・マイページのセッションには流用できない）。
//   intake-counter  … 初めての方（未登録）用。{store, exp, p, kiosk}
//   intake-customer … 登録済みで未記入の方用。{cid, store, exp, p, kiosk}
export const COUNTER_PHONE_TTL_MS = 2 * 60 * 60 * 1000;   // お客様のスマホ用QR：2時間
export const COUNTER_KIOSK_TTL_MS = 14 * 60 * 60 * 1000;  // 受付タブレット：14時間
export const CUSTOMER_TTL_MS = 2 * 60 * 60 * 1000;        // 顧客限定：2時間

function intakeSecret() {
  const base = process.env.NEXTAUTH_SECRET;
  return base ? base + ":intake-counter-v1" : null;
}
const sign = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

function createToken(obj) {
  const secret = intakeSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return payload + "." + sign(payload, secret);
}

export function createCounterToken(store, kiosk) {
  const ttl = kiosk ? COUNTER_KIOSK_TTL_MS : COUNTER_PHONE_TTL_MS;
  const exp = Date.now() + ttl;
  return { token: createToken({ store, exp, p: "intake-counter", kiosk: kiosk ? 1 : 0 }), exp };
}

export function createCustomerToken(customerId, store, kiosk) {
  const exp = Date.now() + CUSTOMER_TTL_MS;
  return { token: createToken({ cid: String(customerId), store, exp, p: "intake-customer", kiosk: kiosk ? 1 : 0 }), exp };
}

// 正しければ { kind: "counter"|"customer", store, cid?, kiosk, exp }、不正・期限切れなら null
export function verifyIntakeToken(token) {
  const secret = intakeSecret();
  if (!secret || !token || typeof token !== "string" || token.length > 1000) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof v.exp !== "number" || Date.now() > v.exp) return null;
    if (!STORE_IDS.includes(v.store)) return null;
    if (v.p === "intake-counter") return { kind: "counter", store: v.store, kiosk: !!v.kiosk, exp: v.exp };
    if (v.p === "intake-customer" && isUuid(v.cid)) return { kind: "customer", cid: v.cid, store: v.store, kiosk: !!v.kiosk, exp: v.exp };
    return null;
  } catch {
    return null;
  }
}

// ── 問診票のURL（予約確定・前日リマインド・マイページで案内する） ──────────
export const MONSHIN_WEB_URL = "https://yurari-booking.vercel.app/mypage/monshin";
export function monshinUrlForLine() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE;
  return liffId ? `https://liff.line.me/${liffId}/monshin` : MONSHIN_WEB_URL;
}
export const INTAKE_INVITE_TEXT =
  "初めてご来院の方へ：カウンセリングシートを事前にご記入いただくと、当日スムーズにご案内できます（約5分）。";

// ── 全件取得（サーバー側） ───────────────────────────────
// 管理画面の fetchAllRows と同じ作り。PostgREST は1回の取得を1,000件で打ち切るため、
// 1,000件ずつ Range で取り、Content-Range の総件数と照合する。揃わなければ null（一部だけの配列は返さない）。
// path の order には一意な列（id）を含め、select にも id を含めること。
export async function fetchAllRowsServer(headers, path, label = "fetchAllRowsServer") {
  const STEP = 1000;
  let all = [];
  let offset = 0;
  let total = null;
  try {
    while (true) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { ...headers, Prefer: "count=exact", "Range-Unit": "items", Range: `${offset}-${offset + STEP - 1}` },
        cache: "no-store",
      });
      if (!res.ok) { console.error(`[${label}] 取得に失敗`, res.status); return null; }
      const data = await res.json();
      if (!Array.isArray(data)) { console.error(`[${label}] 応答が配列でない`); return null; }
      const m = (res.headers.get("Content-Range") || "").match(/\/(\d+)$/);
      if (m) total = Number(m[1]);
      all = all.concat(data);
      if (data.length === 0 || (total !== null ? all.length >= total : data.length < STEP)) break;
      offset += data.length;
      if (offset > 50000) { console.error(`[${label}] 件数が多すぎる`); return null; }
    }
  } catch (e) {
    console.error(`[${label}] 取得に失敗`, e.message);
    return null;
  }
  const seen = new Set();
  all = all.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  if (total !== null && all.length !== total) {
    console.error(`[${label}] 件数が合わない`, { got: all.length, total });
    return null;
  }
  return all;
}

// 顧客IDのうち「問診票あり」「来院実績あり（会計済・物販のみは除く）」のものを返す。
// 取得に失敗したら例外を投げる（呼び出し側で「案内しない」「表示しない」に倒す）。
export async function intakeAndVisitStatus(headers, customerIds) {
  const ids = [...new Set((customerIds || []).filter(isUuid))];
  const withIntake = new Set();
  const visited = new Set();
  for (let i = 0; i < ids.length; i += 80) {
    const list = ids.slice(i, i + 80).join(",");
    const [forms, visits] = await Promise.all([
      fetchAllRowsServer(headers, `intake_forms?customer_id=in.(${list})&select=id,customer_id&order=id.asc`, "intake-status:forms"),
      fetchAllRowsServer(headers, `bookings?${VISIT}&customer_id=in.(${list})&select=id,customer_id&order=id.asc`, "intake-status:visits"),
    ]);
    if (!forms || !visits) throw new Error("問診票・来院実績の取得に失敗しました");
    forms.forEach((r) => withIntake.add(String(r.customer_id)));
    visits.forEach((r) => visited.add(String(r.customer_id)));
  }
  return { withIntake, visited };
}

// 案内の対象（問診票が未記入 かつ 来院実績なし）の顧客IDの Set
export async function customersNeedingIntake(headers, customerIds) {
  const { withIntake, visited } = await intakeAndVisitStatus(headers, customerIds);
  return new Set([...new Set((customerIds || []).filter(isUuid))].filter((id) => !withIntake.has(id) && !visited.has(id)));
}

// ── 入力値の検査 ──────────────────────────────────────
const MAX_TEXT = 1000;
const MAX_SHORT = 200;
const str = (v, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strArr = (v, maxItems = 20) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 100)).filter(Boolean).slice(0, maxItems) : []);

const ANSWER_TEXT = ["introducer", "job", "commuteMin", "workHours", "family", "bath", "bathMin", "sleepHours", "stressOther", "sportNow", "sportPast", "illness", "medicine", "note"];
const ANSWER_ARRAYS = ["found", "commute", "holiday", "sleepPos", "stress"];

export function sanitizeAnswers(a) {
  const out = {};
  for (const k of ANSWER_TEXT) out[k] = str(a?.[k]);
  for (const k of ANSWER_ARRAYS) out[k] = strArr(a?.[k]);
  const syms = Array.isArray(a?.symptoms) ? a.symptoms.slice(0, 5) : [];
  out.symptoms = syms.map((s) => ({ what: str(s?.what, 300), since: str(s?.since, 300), tried: str(s?.tried, 300), want: str(s?.want, 300) }))
    .filter((s, i) => i === 0 || s.what || s.since || s.tried || s.want);
  if (!out.symptoms[0]?.what) return { error: "1つ目のお悩みを入力してください" };
  return { answers: out };
}

export function sanitizeMarks(m) {
  if (!Array.isArray(m)) return [];
  return m.slice(0, 60)
    .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)
    .map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
}

const GENDERS = ["男性", "女性", "回答しない"];

function validBirthday(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= "1900-01-01" && d.getTime() <= Date.now();
}

// お客様情報（入力欄）を検査する。戻り値 { profile } または { error }
export function sanitizeProfile(p) {
  const profile = {
    name: str(p?.name, 100),
    kana: str(p?.kana, 100),
    gender: GENDERS.includes(p?.gender) ? p.gender : "",
    birthday: typeof p?.birthday === "string" ? p.birthday : "",
    zipcode: digits(p?.zipcode).slice(0, 7),
    address: str(p?.address, MAX_SHORT),
    tel: digits(p?.tel),
    tel2: str(p?.tel2, 30),
    email: str(p?.email, MAX_SHORT),
    contact: p?.contact === "email" ? "email" : "line",
  };
  if (!profile.kana) return { error: "ふりがなを入力してください" };
  if (!profile.name) return { error: "お名前を入力してください" };
  if (!validBirthday(profile.birthday)) return { error: "生年月日を選んでください" };
  if (profile.tel.length < 10 || profile.tel.length > 11) return { error: "携帯電話の番号を確認してください" };
  if (profile.zipcode && profile.zipcode.length !== 7) return { error: "郵便番号は7桁で入力してください" };
  if (profile.contact === "email" && !profile.email) return { error: "メールアドレスを入力してください" };
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return { error: "メールアドレスの形式が正しくありません" };
  return { profile };
}

// 顧客レコードから「ご登録内容の確認」に出す値を作る
export function profileFromCustomer(c) {
  return {
    name: c.name || "", kana: c.kana || "", gender: c.gender || "", birthday: c.birthday || "",
    zipcode: c.zipcode || "", address: c.address || "", tel: c.tel || "", tel2: c.tel2 || "", email: c.email || "",
    contact: c.line_user_id ? "line" : c.notification_method === "email" ? "email" : c.notification_method === "line" ? "line" : "",
    line_linked: !!c.line_user_id,
  };
}

const CUSTOMER_COLS = "id,name,kana,tel,tel2,email,zipcode,address,birthday,gender,line_user_id,notification_method,is_deleted";

// ── B：初めての方（未登録）の照合 ─────────────────────────
// 携帯番号（数字のみ）で既存顧客（is_deleted でない）を探す。生年月日は照合に使わない。
// booking-form/register と同じく「電話番号（tel）の一致」で照合し、ハイフンなどの書き方の違いは同じ番号として扱う。
//   1件 → その顧客に紐づける（既存の値は上書きせず、空欄だけ補う）
//   2件以上 → 登録しない（{ error: "multiple" }）
//   0件 → 新規作成（顧客番号は付けない。受付時に assign_customer_number で採番）
export async function matchOrCreateCustomer(headers, profile) {
  const d = digits(profile.tel);
  if (!d) throw new Error("電話番号が空です");
  // 数字の間に区切り文字（ハイフン・空白）があっても候補に入れ、最後に数字だけで完全一致を確かめる
  const pattern = "*" + d.split("").join("*") + "*";
  const rows = await sbFetch(headers, `customers?tel=like.${encodeURIComponent(pattern)}&is_deleted=not.is.true&select=${CUSTOMER_COLS}&limit=50`);
  const hits = (Array.isArray(rows) ? rows : []).filter((c) => digits(c.tel) === d);
  console.log("[monshin] 携帯番号で照合", JSON.stringify({ hits: hits.length }));

  if (hits.length > 1) return { error: "multiple" };

  if (hits.length === 1) {
    const c = hits[0];
    const fill = {};
    const empty = (v) => v === null || v === undefined || String(v).trim() === "";
    if (empty(c.kana) && profile.kana) fill.kana = profile.kana;
    if (empty(c.email) && profile.email) fill.email = profile.email;
    if (empty(c.zipcode) && profile.zipcode) fill.zipcode = profile.zipcode;
    if (empty(c.address) && profile.address) fill.address = profile.address;
    if (empty(c.tel2) && profile.tel2) fill.tel2 = profile.tel2;
    if (empty(c.gender) && profile.gender) fill.gender = profile.gender;
    // 生年月日：空なら補う。入っていて食い違う場合は上書きしない（管理画面の問診票欄に「相違」と出す）
    if (empty(c.birthday) && profile.birthday) fill.birthday = profile.birthday;
    // 連絡方法が未設定（なし）で、メールで受け取る希望とメールアドレスがあればメールにする（LINE は連携時に切り替わる）
    if ((empty(c.notification_method) || c.notification_method === "none") && !c.line_user_id && profile.contact === "email" && (c.email || profile.email)) {
      fill.notification_method = "email";
    }
    if (Object.keys(fill).length > 0) {
      await sbFetch(headers, `customers?id=eq.${encodeURIComponent(c.id)}`, { method: "PATCH", body: JSON.stringify(fill) });
    }
    return { customer: { ...c, ...fill }, existed: true };
  }

  const created = await sbFetch(headers, "customers", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      name: profile.name, kana: profile.kana, tel: d, tel2: profile.tel2 || null,
      email: profile.email || null, zipcode: profile.zipcode || null, address: profile.address || null,
      birthday: profile.birthday, gender: profile.gender || null,
      // LINE未連携のまま 'line' にしない（リマインドが届かないまま「送信済み」になるため。c60d7ec と同じ方針）
      notification_method: profile.email ? "email" : "none",
    }),
  });
  const row = Array.isArray(created) ? created[0] : null;
  if (!row?.id) throw new Error("顧客IDが返りませんでした");
  return { customer: row, existed: false };
}

// ── A・C：登録済みの方が「内容を修正する」で直した内容を反映する ─────────────
// 本人（マイページのセッション）または受付で発行した顧客限定トークンの方だけが対象。
// 生年月日はマイページのログインに使うため上書きしない（空なら補う。食い違いは管理画面に出す）。
// 携帯番号を変える場合は、同じ番号の別の顧客がいれば反映しない（{ error: "tel_conflict" }）。
export async function applyProfileEdit(headers, customer, profile) {
  const update = {};
  // 空欄にした項目は消さない（メールを消して連絡が届かなくなる、などを避ける）。変更・追加だけ反映する
  for (const k of ["name", "kana", "email", "zipcode", "address", "tel2"]) {
    if (profile[k] && profile[k] !== (customer[k] || "")) update[k] = profile[k];
  }
  if (profile.gender && profile.gender !== customer.gender) update.gender = profile.gender;
  if (!customer.birthday && profile.birthday) update.birthday = profile.birthday;
  if (digits(profile.tel) !== digits(customer.tel)) {
    const d = digits(profile.tel);
    const pattern = "*" + d.split("").join("*") + "*";
    const rows = await sbFetch(headers, `customers?tel=like.${encodeURIComponent(pattern)}&is_deleted=not.is.true&id=neq.${encodeURIComponent(customer.id)}&select=id,tel&limit=50`);
    if ((Array.isArray(rows) ? rows : []).some((c) => digits(c.tel) === d)) return { error: "tel_conflict" };
    update.tel = d;
  }
  if (profile.contact === "email" && profile.email && customer.notification_method !== "email") update.notification_method = "email";
  if (profile.contact === "line" && customer.line_user_id && customer.notification_method !== "line") update.notification_method = "line";
  if (Object.keys(update).length > 0) {
    await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer.id)}`, { method: "PATCH", body: JSON.stringify(update) });
  }
  return { customer: { ...customer, ...update } };
}

export async function fetchCustomer(headers, id) {
  if (!isUuid(id)) return null;
  const rows = await sbFetch(headers, `customers?id=eq.${encodeURIComponent(id)}&is_deleted=not.is.true&select=${CUSTOMER_COLS}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// 次回の予約（今日以降で最も近いもの）
export async function nextBooking(headers, customerId) {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await sbFetch(headers,
    `bookings?customer_id=eq.${encodeURIComponent(customerId)}&booking_date=gte.${today}&status=in.(pending,confirmed,received)` +
    `&select=booking_date,booking_time,store_id,course_name&order=booking_date.asc,booking_time.asc&limit=1`);
  const b = Array.isArray(rows) ? rows[0] : null;
  if (!b) return null;
  return { date: b.booking_date, time: String(b.booking_time || "").slice(0, 5), store_id: b.store_id, store_name: storeName(b.store_id) };
}
