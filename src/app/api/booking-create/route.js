import { NextResponse } from "next/server";
import {
  requireServiceHeaders, sbFetch, verifiedLineUserId, mypageCustomer, digits, isSafeId,
} from "../_lib/booking-auth";
import { canStaffHandleCourse } from "../../_lib/staff-eligibility";

// 顧客向け予約フォームからの予約登録。
// 登録の直前に「customer_id が、フォームで確定した顧客本人か」をサーバー側で再検証する。
// 過去に、画面の顧客情報が空のまま予約され、電話番号が空の別の顧客に紐づく事故が起きたため、
// 一致しない・判断できない場合は登録せずにエラーを返す（fail-closed）。
//
// 本人確認の材料（クライアントから送られた顧客ID・LINEユーザーIDそのものは信用しない）：
//   - フォームの電話番号が DB の電話番号と一致
//   - サーバーで検証できたLINEユーザーID（LIFF の検証済みCookie / NextAuth）が DB と一致
//   - マイページのセッションの顧客と一致
//
// 予約変更（change_booking_id）の場合は、新しい予約の登録に成功した後でのみ、
// 元の予約が同じ顧客のものであることを確認してキャンセルする（cancelled_at も記録）。

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
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const headers = s.headers;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { customer_id, tel, match, bookings, change_booking_id } = payload || {};

  const lineUserId = await verifiedLineUserId(request);

  // 再発時にVercelのログで追えるよう、照合条件（電話番号の有無・ヒット件数）を必ず残す
  const log = {
    customer_id: customer_id || null,
    form_has_tel: digits(tel).length > 0,
    has_verified_line: !!lineUserId,
    match_source: match?.source ?? null,
    match_has_tel: match?.has_tel ?? null,
    match_hits: match?.hits ?? null,
    change: !!change_booking_id,
  };

  if (!customer_id || typeof customer_id !== "string" || !isSafeId(customer_id)) {
    return fail(400, "お客様情報が確認できませんでした", log);
  }
  if (!Array.isArray(bookings) || bookings.length < 1 || bookings.length > 2) {
    return fail(400, "予約内容が不正です", log);
  }
  if (change_booking_id != null && !isSafeId(change_booking_id)) {
    return fail(400, "変更元の予約が不正です", log);
  }

  // ── 顧客の再検証 ─────────────────────────────
  let c;
  let fromMypage = null;
  try {
    const rows = await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer_id)}&select=id,name,tel,line_user_id,is_deleted`);
    if (!Array.isArray(rows) || rows.length !== 1) {
      return fail(409, "お客様情報が確認できませんでした", { ...log, server_hits: Array.isArray(rows) ? rows.length : null });
    }
    c = rows[0];
    fromMypage = await mypageCustomer(request, headers);
  } catch (e) {
    console.error("[booking-create] 顧客取得失敗", e.message);
    return fail(500, "お客様情報の確認に失敗しました", log);
  }
  if (c.is_deleted) {
    return fail(409, "お客様情報が確認できませんでした", { ...log, reason: "deleted" });
  }

  // 空同士は一致とみなさない（空の電話番号の顧客に紐づく事故の再発防止）。
  const formTel = digits(tel);
  const dbTel = digits(c.tel);
  const telOk = formTel.length > 0 && dbTel.length > 0 && formTel === dbTel;
  const lineOk = !!lineUserId && !!c.line_user_id && lineUserId === c.line_user_id;
  const mypageOk = !!fromMypage && String(fromMypage.id) === String(c.id);
  if (!telOk && !lineOk && !mypageOk) {
    return fail(409, "お客様情報が一致しないため予約を登録できませんでした", {
      ...log, db_has_tel: dbTel.length > 0, db_has_line: !!c.line_user_id,
    });
  }

  console.log("[booking-create] 顧客照合OK", JSON.stringify({ ...log, verified_by: telOk ? "tel" : lineOk ? "line" : "mypage" }));

  // ── 担当スタッフがメニューを担当できるかの検証 ─────────────
  // 画面でも絞っているが、古い画面が残った端末から誤った組み合わせが送られても登録しない（全件を登録前に確認）。
  const pairs = bookings.map((b) => ({ course_id: b?.course_id, staff_id: b?.staff_id }));
  if (pairs.some((p) => typeof p.course_id !== "string" || !isSafeId(p.course_id) || typeof p.staff_id !== "string" || !isSafeId(p.staff_id))) {
    return fail(400, "予約内容が不正です", { ...log, reason: "course_or_staff_missing" });
  }
  try {
    const courseIds = [...new Set(pairs.map((p) => p.course_id))].join(",");
    const staffIds = [...new Set(pairs.map((p) => p.staff_id))].join(",");
    const [courseRows, staffRows] = await Promise.all([
      sbFetch(headers, `course_menus?id=in.(${courseIds})&select=id,category,exclusive_staff_id`),
      sbFetch(headers, `staff_members?id=in.(${staffIds})&select=id,categories`),
    ]);
    for (const p of pairs) {
      const course = Array.isArray(courseRows) ? courseRows.find((r) => String(r.id) === p.course_id) : null;
      const staff = Array.isArray(staffRows) ? staffRows.find((r) => String(r.id) === p.staff_id) : null;
      if (!canStaffHandleCourse(staff, course)) {
        return fail(422, "選択された担当スタッフはこのメニューを担当できません。お手数ですが、担当スタッフを選び直してください。", {
          ...log, reason: "staff_not_eligible", course_id: p.course_id, staff_id: p.staff_id,
          course_found: !!course, staff_found: !!staff,
        });
      }
    }
  } catch (e) {
    console.error("[booking-create] 担当スタッフの確認に失敗", e.message);
    return fail(500, "予約内容の確認に失敗しました", log);
  }

  // ── 予約の登録 ─────────────────────────────
  const insert = async (body) => {
    try {
      const data = await sbFetch(headers, "bookings", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({ ...body, customer_id: c.id, status: "confirmed" }),
      });
      return { ok: true, id: Array.isArray(data) ? data[0]?.id : null };
    } catch (e) {
      return { ok: false, id: null, error: e.message };
    }
  };

  const first = pickBooking(bookings[0]);
  const b1 = await insert(first);
  if (!b1.ok || !b1.id) {
    console.error("[booking-create] 予約登録失敗", b1.error);
    return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
  }

  let booking2Id = null;
  if (bookings[1]) {
    const b2 = await insert({ ...pickBooking(bookings[1]), connected_booking_id: b1.id });
    if (b2.ok && b2.id) {
      booking2Id = b2.id;
      await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(b1.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ connected_booking_id: b2.id }),
      }).catch((e) => console.error("[booking-create] 連続予約の紐付け失敗", e.message));
    } else {
      console.error("[booking-create] 2件目の予約登録失敗", b2.error);
    }
  }

  // ── 予約変更：元の予約をキャンセル（新しい予約の登録に成功した後でのみ） ──
  let changeCancelled = false;
  if (change_booking_id) {
    try {
      const src = await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(change_booking_id)}&select=id,customer_id,status`);
      const orig = Array.isArray(src) ? src[0] : null;
      if (!orig || String(orig.customer_id) !== String(c.id)) {
        // 他人の予約はキャンセルしない
        console.error("[booking-create] 変更元の予約が本人のものではないためキャンセルしません", JSON.stringify({ found: !!orig }));
      } else if (orig.status === "cancelled" || orig.status === "completed") {
        console.error("[booking-create] 変更元の予約はキャンセル済み・会計済みのため変更しません", orig.status);
      } else {
        await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(orig.id)}&customer_id=eq.${encodeURIComponent(c.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
        });
        changeCancelled = true;
      }
    } catch (e) {
      console.error("[booking-create] 元の予約のキャンセルに失敗", e.message);
    }
  }

  // ── 管理画面への通知（失敗しても予約は成立しているのでログのみ） ──
  try {
    await sbFetch(headers, "admin_notifications", {
      method: "POST",
      body: JSON.stringify({
        store_id: first.store_id,
        type: change_booking_id ? "booking_change" : "new_booking",
        title: change_booking_id ? "予約変更" : "新規予約",
        body: (c.name || "") + "様 " + first.booking_date + " " + first.booking_time + " " + first.course_name,
        customer_id: c.id,
      }),
    });
  } catch (e) {
    console.error("[booking-create] 管理画面への通知に失敗", e.message);
  }

  console.log("[booking-create] 予約登録", JSON.stringify({ customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id, change_cancelled: changeCancelled }));
  return NextResponse.json({ ok: true, customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id, change_cancelled: changeCancelled });
}
