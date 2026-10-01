import { NextResponse } from "next/server";
import { SUPABASE_URL, sbHeaders, sbSelect, q } from "../_lib/server";

// 顧客向け予約フォームからの予約登録。
// 登録の直前に「customer_id が、フォームで確定した顧客本人か」をサーバー側で再検証する。
// 過去に、画面の顧客情報が空のまま予約され、電話番号が空の別の顧客に紐づく事故が起きたため、
// 一致しない・判断できない場合は登録せずにエラーを返す（fail-closed）。

const digits = (v) => String(v ?? "").replace(/[^0-9]/g, "");

// クライアントから受け取る予約の項目（これ以外は捨てる）
const BOOKING_FIELDS = [
  "store_id", "course_id", "course_name", "course_duration",
  "staff_id", "staff_name", "booking_date", "booking_time", "notes", "booking_number",
];
const pickBooking = (b) => {
  const out = {};
  for (const k of BOOKING_FIELDS) if (b?.[k] !== undefined) out[k] = b[k];
  return out;
};

const fail = (status, error, log) => {
  console.error("[booking-create] 登録拒否", JSON.stringify({ status, error, ...log }));
  return NextResponse.json({ error }, { status });
};

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { customer_id, tel, line_user_id, match, bookings } = payload || {};

  // 再発時にVercelのログで追えるよう、照合条件（電話番号の有無・ヒット件数）を必ず残す
  const log = {
    customer_id: customer_id || null,
    form_has_tel: digits(tel).length > 0,
    form_has_line: !!line_user_id,
    match_source: match?.source ?? null,
    match_has_tel: match?.has_tel ?? null,
    match_hits: match?.hits ?? null,
  };

  if (!customer_id || typeof customer_id !== "string") {
    return fail(400, "お客様情報が確認できませんでした", log);
  }
  if (!Array.isArray(bookings) || bookings.length < 1 || bookings.length > 2) {
    return fail(400, "予約内容が不正です", log);
  }

  // ── 顧客の再検証 ─────────────────────────────
  let rows;
  try {
    rows = await sbSelect(`customers?id=eq.${q(customer_id)}&select=id,tel,line_user_id,is_deleted`);
  } catch (e) {
    console.error("[booking-create] 顧客取得失敗", e);
    return fail(500, "お客様情報の確認に失敗しました", log);
  }
  if (rows.length !== 1) {
    return fail(409, "お客様情報が確認できませんでした", { ...log, server_hits: rows.length });
  }
  const c = rows[0];
  if (c.is_deleted) {
    return fail(409, "お客様情報が確認できませんでした", { ...log, reason: "deleted" });
  }

  // フォームの電話番号 or LINEユーザーIDが、DB上のその顧客と一致すること。
  // 空同士は一致とみなさない（空の電話番号の顧客に紐づく事故の再発防止）。
  const formTel = digits(tel);
  const dbTel = digits(c.tel);
  const telOk = formTel.length > 0 && dbTel.length > 0 && formTel === dbTel;
  const lineOk = !!line_user_id && !!c.line_user_id && line_user_id === c.line_user_id;
  if (!telOk && !lineOk) {
    return fail(409, "お客様情報が一致しないため予約を登録できませんでした", {
      ...log, db_has_tel: dbTel.length > 0, db_has_line: !!c.line_user_id,
    });
  }

  console.log("[booking-create] 顧客照合OK", JSON.stringify({ ...log, verified_by: telOk ? "tel" : "line" }));

  // ── 予約の登録 ─────────────────────────────
  const insert = async (body) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ ...body, customer_id: c.id, status: "confirmed" }),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, id: Array.isArray(data) ? data[0]?.id : null, data };
  };

  const b1 = await insert(pickBooking(bookings[0]));
  if (!b1.ok || !b1.id) {
    console.error("[booking-create] 予約登録失敗", b1.status, JSON.stringify(b1.data));
    return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
  }

  let booking2Id = null;
  if (bookings[1]) {
    const b2 = await insert({ ...pickBooking(bookings[1]), connected_booking_id: b1.id });
    if (b2.ok && b2.id) {
      booking2Id = b2.id;
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${q(b1.id)}`, {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({ connected_booking_id: b2.id }),
      }).catch((e) => console.error("[booking-create] 連続予約の紐付け失敗", e));
    } else {
      console.error("[booking-create] 2件目の予約登録失敗", b2.status, JSON.stringify(b2.data));
    }
  }

  console.log("[booking-create] 予約登録", JSON.stringify({ customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id }));
  return NextResponse.json({ ok: true, customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id });
}
