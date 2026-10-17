// お客様側（マイページ・予約変更）からのキャンセル・変更の受付締切。
// 管理画面からの操作には使わない（スタッフはいつでも操作できる）。
//
// 判定（store_settings の店舗ごとの設定）：
//   1. 施術日の前日 cancel_deadline_time（日本時間）を過ぎていたら不可（ちょうどの時刻は可）
//   2. ただし予約の作成（created_at）から cancel_grace_minutes 分以内なら可（押し間違いの救済）
//   3. cancel_deadline_time が未設定（NULL）・設定行が無い場合は制限なし
//      （設定が消えて操作できなくなる方が困るため）
//
// 時刻はすべて UTC のエポックミリ秒に直して比較するので、サーバーのタイムゾーン設定に依存しない。
import { sbFetch } from "./mypage-auth";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const DEADLINE_PASSED_MESSAGE = "受付時間を過ぎているため、変更・キャンセルはお電話にてご連絡ください";
export const DEADLINE_PASSED_CODE = "deadline_passed";

// 施術日の前日 HH:MM:SS（日本時間）を UTC のエポックミリ秒で返す。解釈できなければ null。
function deadlineMs(bookingDate, deadlineTime) {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(bookingDate ?? ""));
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(deadlineTime ?? ""));
  if (!d || !t) return null;
  // Date.UTC は日付の 0 日（= 前月末日）も正しく繰り下げる
  return Date.UTC(+d[1], +d[2] - 1, +d[3] - 1, +t[1], +t[2], +(t[3] || 0)) - JST_OFFSET_MS;
}

// created_at を UTC のエポックミリ秒にする。タイムゾーン表記の無い値は（Supabase の既定どおり）UTC とみなす。
// Date.parse はタイムゾーン表記が無いとサーバーのローカル時刻として解釈するため、そのままでは使わない。
function parseTimestamp(v) {
  const s = String(v ?? "").trim().replace(" ", "T");
  if (!s) return NaN;
  return Date.parse(/(Z|[+-]\d{2}(:?\d{2})?)$/.test(s) ? s : s + "Z");
}

// booking: { booking_date, created_at }、settings: store_settings の行（無ければ null）
export function canCustomerModify(booking, settings, now = Date.now()) {
  if (!settings || settings.cancel_deadline_time == null) return true; // 未設定は制限なし
  const deadline = deadlineMs(booking?.booking_date, settings.cancel_deadline_time);
  if (deadline == null) return true; // 設定値を解釈できない場合も制限しない（3 と同じ考え方）

  // ちょうど 19:30:00 を可にするため、秒未満は切り捨てて比較する
  const nowSec = Math.floor(now / 1000) * 1000;
  if (nowSec <= deadline) return true;

  const grace = Number(settings.cancel_grace_minutes);
  const created = parseTimestamp(booking?.created_at);
  if (Number.isFinite(grace) && grace > 0 && Number.isFinite(created)) {
    if (now <= created + grace * 60 * 1000) return true;
  }
  return false;
}

// 店舗ID → 設定行。予約一覧のように複数店舗にまたがる場合はまとめて1回で取る。
export async function fetchDeadlineSettings(headers, storeIds) {
  const ids = [...new Set((storeIds || []).filter(Boolean).map(String))];
  if (ids.length === 0) return {};
  const rows = await sbFetch(headers,
    `store_settings?store_id=in.(${ids.map(encodeURIComponent).join(",")})&select=store_id,cancel_deadline_time,cancel_grace_minutes`);
  const map = {};
  for (const r of Array.isArray(rows) ? rows : []) map[r.store_id] = r;
  return map;
}

// API でそのまま返せる拒否レスポンスの中身
export const deadlinePassedBody = () => ({ error: DEADLINE_PASSED_MESSAGE, code: DEADLINE_PASSED_CODE });
