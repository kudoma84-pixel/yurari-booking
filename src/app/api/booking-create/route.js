import { NextResponse } from "next/server";
import {
  requireServiceHeaders, sbFetch, verifiedLineUserId, mypageCustomer, digits, isSafeId, isDate,
} from "../_lib/booking-auth";
import { canStaffHandleCourse } from "../../_lib/staff-eligibility";
import { isWithinShift } from "../../_lib/shift-hours";
import { canCustomerModify, fetchDeadlineSettings, deadlinePassedBody } from "../_lib/modify-deadline";
import { customersNeedingIntake, createCustomerToken } from "../_lib/intake";

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

const fail = (status, error, log, code) => {
  console.error("[booking-create] 登録拒否", JSON.stringify({ status, error, ...log }));
  return NextResponse.json(code ? { error, code } : { error }, { status });
};

// ── 空き枠の再確認で使う部品 ─────────────────────────
// 予約フォームの時刻の選択肢（src/app/src/page.js の TIME_SLOTS と同じ。10:00〜19:00 の30分刻み）
const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => fromMin(600 + i * 30));
// 有効な予約の状態（画面の空き枠 /api/booking-form/booked-slots と同じ。キャンセル・会計済みなどは含めない）
const ACTIVE_STATUSES = "confirmed,received,treatment_done";
// 休憩（13:30〜14:30）。time_extensions で解放されていなければ予約できない（画面と同じ）
const BREAK_SLOTS = [["13:30", "break_released_1330"], ["14:00", "break_released_1400"], ["14:30", "break_released_1430"]];

function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
function fromMin(n) {
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}
// 所要時間は「30分」「90」などの表記ゆれがあるため、画面と同じく数字だけを取り出して分とする（読めなければ30分）
function durationMin(d) {
  return parseInt(String(d ?? "").replace(/[^0-9]/g, ""), 10) || 30;
}
// 予約 w（担当・日・開始・所要時間）と時間帯が重なる予約があるか
function overlapsAny(existing, w) {
  return existing.some((r) => String(r.staff_id) === String(w.staff_id) && r.booking_date === w.date
    && r.start < w.start + w.dur && w.start < r.start + r.dur);
}

// 対象の担当・日の有効な予約（変更元の予約は除く）。所要時間が入っていない予約はコースの所要時間で補う（booked-slots と同じ）
async function fetchActiveBookings(headers, slots, changeBookingId) {
  if (slots.length === 0) return [];
  const staffIds = [...new Set(slots.map((x) => x.staff_id))].join(",");
  const dates = [...new Set(slots.map((x) => x.date))].join(",");
  const exclude = changeBookingId ? `&id=neq.${encodeURIComponent(changeBookingId)}` : "";
  const rows = await sbFetch(headers,
    `bookings?staff_id=in.(${staffIds})&booking_date=in.(${dates})&status=in.(${ACTIVE_STATUSES})${exclude}` +
    `&select=id,staff_id,booking_date,booking_time,course_id,course_duration`);
  const list = Array.isArray(rows) ? rows : [];
  const missing = [...new Set(list.filter((r) => !r.course_duration && r.course_id).map((r) => String(r.course_id)))].filter(isSafeId);
  let courses = [];
  if (missing.length > 0) {
    const c = await sbFetch(headers, `course_menus?id=in.(${missing.join(",")})&select=id,duration`);
    courses = Array.isArray(c) ? c : [];
  }
  return list
    .map((r) => ({
      ...r,
      start: toMin(r.booking_time),
      dur: durationMin(r.course_duration || courses.find((c) => String(c.id) === String(r.course_id))?.duration),
    }))
    .filter((r) => Number.isFinite(r.start));
}

// 同じ日・同じ担当で、希望の時刻に近い空き時刻を最大3つ（早い順）。
// 予約フォームで選べる時刻と同じ条件で絞る：時刻の選択肢・受付時間（シフト）・休院日・休憩・ブロック・当日の受付締切・他の予約。
// 連続予約は、1件目の開始時刻をずらし、2件目は今までどおり1件目の終了時刻から始まるものとして確認する。
async function findAlternatives(headers, bookings, want, existing) {
  const first = bookings[0];
  const storeId = first?.store_id;
  const date = first?.booking_date;
  if (!isSafeId(storeId) || !isDate(date) || bookings.some((b) => b?.store_id !== storeId || b?.booking_date !== date)) return [];
  const staffIds = [...new Set([...want.map((w) => w.staff_id).filter((id) => id !== "any"), "closed"])];
  const [shiftRows, extRows, blockRows, settingRows] = await Promise.all([
    sbFetch(headers, `shifts?store_id=eq.${storeId}&work_date=eq.${date}&staff_id=in.(${staffIds.join(",")})&select=staff_id,start_time,end_time`),
    sbFetch(headers, `time_extensions?store_id=eq.${storeId}&extension_date=eq.${date}&order=created_at.desc&limit=1`),
    sbFetch(headers, `blocks?store_id=eq.${storeId}&block_date=eq.${date}&select=staff_id,block_time`),
    sbFetch(headers, `store_settings?store_id=eq.${storeId}&select=same_day_lead_time`),
  ]);
  const shifts = Array.isArray(shiftRows) ? shiftRows : [];
  if (shifts.some((r) => r.staff_id === "closed")) return [];
  const ext = Array.isArray(extRows) ? extRows[0] || null : null;
  const blocks = Array.isArray(blockRows) ? blockRows : [];
  const leadMin = Number(Array.isArray(settingRows) ? settingRows[0]?.same_day_lead_time : NaN);
  const lead = Number.isFinite(leadMin) ? leadMin : 60; // 画面の既定値と同じ
  const blockedFor = (staffId) => {
    const set = new Set(BREAK_SLOTS.filter(([, key]) => !ext?.[key]).map(([t]) => t));
    for (const b of blocks) if (b.staff_id === staffId || b.staff_id === "all") { const t = String(b.block_time || "").slice(0, 5); if (t) set.add(t); }
    return set;
  };
  // 今日なら、受付締切（同日の何分前まで）を過ぎた時刻は出さない（日本時間で判定）
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const isToday = nowJst.toISOString().slice(0, 10) === date;
  const nowMin = nowJst.getUTCHours() * 60 + nowJst.getUTCMinutes();

  const offsets = want.map((w) => w.start - want[0].start); // 2件目は1件目の終了時刻から（今までと同じずれ）
  const okAt = (t0) => want.every((w, i) => {
    const start = t0 + offsets[i];
    if (i === 0) {
      // 1件目は、所要時間ぶんの枠がすべて時刻の選択肢に収まること（画面と同じ）
      for (let m = start; m < start + w.dur; m += 30) if (!TIME_SLOTS.includes(fromMin(m))) return false;
      if (isToday && start - nowMin < lead) return false;
    }
    if (w.staff_id === "any") return true;
    const shift = shifts.find((r) => String(r.staff_id) === String(w.staff_id));
    if (!isWithinShift(shift, fromMin(start))) return false;
    const blocked = blockedFor(String(w.staff_id));
    for (let m = start; m < start + w.dur; m += 30) if (blocked.has(fromMin(m))) return false;
    return !overlapsAny(existing, { ...w, start });
  });
  return TIME_SLOTS.map(toMin)
    .filter((t) => t !== want[0].start && okAt(t))
    .sort((a, b) => Math.abs(a - want[0].start) - Math.abs(b - want[0].start) || a - b)
    .slice(0, 3)
    .sort((a, b) => a - b)
    .map(fromMin);
}

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

  // ── 担当スタッフのシフト（受付時間）の検証 ─────────────
  // 画面でも絞っているが、シフト変更前に開いた画面や直接の呼び出しから受付時間外の予約が入らないようにする。
  // 開始時刻が start_time〜end_time（end_time は最終受付時刻）に入っていること、休院日でないことを全件確認する。
  // 指名なし（staff_id = "any"）は担当が決まっていないため対象外。
  const slots = bookings
    .map((b) => ({ store_id: b?.store_id, staff_id: b?.staff_id, date: b?.booking_date, time: b?.booking_time }))
    .filter((x) => x.staff_id !== "any");
  if (slots.some((x) => typeof x.store_id !== "string" || !isSafeId(x.store_id) || !isDate(x.date)
    || typeof x.time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(x.time))) {
    return fail(400, "予約内容が不正です", { ...log, reason: "date_or_time_invalid" });
  }
  try {
    const storeIds = [...new Set(slots.map((x) => x.store_id))].join(",");
    const dates = [...new Set(slots.map((x) => x.date))].join(",");
    const staffIds = [...new Set([...slots.map((x) => x.staff_id), "closed"])].join(",");
    const shiftRows = slots.length === 0 ? [] : await sbFetch(headers, `shifts?store_id=in.(${storeIds})&work_date=in.(${dates})&staff_id=in.(${staffIds})&select=store_id,staff_id,work_date,start_time,end_time`);
    const rows = Array.isArray(shiftRows) ? shiftRows : [];
    for (const x of slots) {
      const sameDay = rows.filter((r) => String(r.store_id) === x.store_id && r.work_date === x.date);
      const closed = sameDay.some((r) => r.staff_id === "closed");
      const shift = sameDay.find((r) => String(r.staff_id) === x.staff_id);
      if (closed || !isWithinShift(shift, x.time)) {
        return fail(422, "選択された日時は担当スタッフの受付時間外です。お手数ですが、日時を選び直してください。", {
          ...log, reason: closed ? "store_closed" : shift ? "outside_shift_hours" : "no_shift",
          store_id: x.store_id, staff_id: x.staff_id, booking_date: x.date, booking_time: x.time,
          shift_start: shift?.start_time ?? null, shift_end: shift?.end_time ?? null,
        });
      }
    }
  } catch (e) {
    console.error("[booking-create] シフトの確認に失敗", e.message);
    return fail(500, "予約内容の確認に失敗しました", log);
  }

  // ── 空き枠の再確認 ─────────────────────────────
  // 日時を選んでから確定するまでの間に、受付（管理画面）が同じ枠に予約を入れた場合に二重に入らないようにする。
  // 同じ担当・同じ日で、時間帯（開始時刻〜所要時間）が重なる有効な予約があれば登録しない。
  //   ・有効な予約：画面の空き枠（/api/booking-form/booked-slots）と同じ confirmed・received・treatment_done
  //   ・予約変更のときは変更元の予約を除く（同じ時間のままメニューだけ変える場合に自分自身とぶつかるため）
  //   ・連続予約（2件）は、それぞれの担当・時間帯で確認する
  //   ・指名なし（"any"）は担当が決まっていないため対象外（シフトの検証と同じ）
  // 埋まっていたら、同じ日・同じ担当で近い空き時刻（最大3つ）を alternatives として返す。
  try {
    const existing = await fetchActiveBookings(headers, slots, change_booking_id);
    const want = bookings.map((b) => ({
      staff_id: b?.staff_id, date: b?.booking_date,
      start: toMin(b?.booking_time), dur: durationMin(b?.course_duration),
    }));
    const hit = want.find((w) => w.staff_id !== "any" && overlapsAny(existing, w));
    if (hit) {
      let alternatives = [];
      try {
        alternatives = await findAlternatives(headers, bookings, want, existing);
      } catch (e) {
        console.error("[booking-create] 近い空き時刻の確認に失敗", e.message);
      }
      console.error("[booking-create] 登録拒否", JSON.stringify({
        status: 422, ...log, reason: "slot_taken", staff_id: hit.staff_id, booking_date: hit.date,
        booking_time: fromMin(hit.start), duration_min: hit.dur, alternatives,
      }));
      return NextResponse.json({
        error: "申し訳ございません。ご希望の時間は、ちょうど他の方のご予約が入りました。\nお手数ですが、日時を選び直してください。",
        code: "slot_taken", alternatives,
      }, { status: 422 });
    }
  } catch (e) {
    console.error("[booking-create] 空き枠の確認に失敗", e.message);
    return fail(500, "予約内容の確認に失敗しました", log);
  }

  // ── 予約変更の事前確認（新しい予約を登録する前に判定し、だめなら何も登録しない） ──
  // 予約変更は「新しい予約を作って元の予約をキャンセルする」流れのため、
  // 元の予約をキャンセルできない状態で新しい予約だけが残らないよう、登録前にすべて確認する：
  //   元の予約が存在する・本人のもの・キャンセル済み/会計済みでない・受付締切を過ぎていない
  // 変更画面を締切前に開いたまま締切後に確定した場合や、直接の呼び出しもここで止める。
  if (change_booking_id) {
    try {
      const src = await sbFetch(headers, `bookings?id=eq.${encodeURIComponent(change_booking_id)}&select=id,customer_id,store_id,status,booking_date,created_at`);
      const orig = Array.isArray(src) ? src[0] : null;
      if (!orig || String(orig.customer_id) !== String(c.id)) {
        return fail(409, "変更元の予約が見つかりませんでした。お手数ですがマイページからやり直してください。", { ...log, reason: "change_source_not_owned", found: !!orig }, "change_source_invalid");
      }
      if (orig.status === "cancelled" || orig.status === "completed") {
        return fail(409, "変更元の予約はすでにキャンセル済み、またはご来院済みのため変更できません。", { ...log, reason: "change_source_closed", source_status: orig.status }, "change_source_invalid");
      }
      const settings = await fetchDeadlineSettings(headers, [orig.store_id]);
      if (!canCustomerModify(orig, settings[orig.store_id])) {
        console.error("[booking-create] 登録拒否", JSON.stringify({ status: 403, reason: "change_deadline_passed", ...log }));
        return NextResponse.json(deadlinePassedBody(orig.store_id, settings[orig.store_id]), { status: 403 });
      }
    } catch (e) {
      console.error("[booking-create] 変更元の予約の確認に失敗", e.message);
      return fail(500, "予約内容の確認に失敗しました", log);
    }
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
  // 本人確認・状態・受付締切は登録前に確認済み。ここで元の予約をキャンセルできなかった場合は、
  // 新しい予約だけが残らないよう、今回登録した予約を取り消してエラーを返す。
  let changeCancelled = false;
  if (change_booking_id) {
    try {
      const updated = await sbFetch(headers,
        `bookings?id=eq.${encodeURIComponent(change_booking_id)}&customer_id=eq.${encodeURIComponent(c.id)}&status=not.in.(cancelled,completed)`, {
          method: "PATCH",
          prefer: "return=representation",
          body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
        });
      changeCancelled = Array.isArray(updated) && updated.length > 0;
      if (!changeCancelled) console.error("[booking-create] 元の予約が更新対象になりませんでした（登録前の確認後に状態が変わった）");
    } catch (e) {
      console.error("[booking-create] 元の予約のキャンセルに失敗", e.message);
    }
    if (!changeCancelled) {
      const newIds = [b1.id, booking2Id].filter(Boolean);
      try {
        await sbFetch(headers, `bookings?id=in.(${newIds.map(encodeURIComponent).join(",")})`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
        });
      } catch (e) {
        // ここまで失敗した場合は新旧両方が残る。スタッフが管理画面で直せるようログに予約IDを残す
        console.error("[booking-create] 要確認：新しい予約の取り消しにも失敗", JSON.stringify({ new_booking_ids: newIds, change_booking_id, error: e.message }));
      }
      return NextResponse.json({ error: "予約の変更に失敗しました。お手数ですが、もう一度お試しいただくか、お電話でご連絡ください。", code: "change_failed" }, { status: 500 });
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

  // 問診票（カウンセリングシート）が未記入 かつ 来院実績なし（物販のみは来院としない）の方には、
  // 確定メッセージに事前記入の案内を付ける（画面側で needs_intake を見て追記する）。確認できなければ付けない。
  let needsIntake = false;
  try {
    needsIntake = (await customersNeedingIntake(headers, [String(c.id)])).has(String(c.id));
  } catch (e) {
    console.error("[booking-create] 問診票の記入状況を確認できませんでした", e.message);
  }

  // 記入が必要な方にだけ、予約完了画面でその場で記入できるよう顧客限定トークン（2時間）を渡す。
  // 既存の /api/monshin/context・/api/monshin/submit がそのまま使える。作れなければ（設定不備など）渡さない。
  let intakeToken = null;
  if (needsIntake) {
    try {
      intakeToken = createCustomerToken(c.id, first.store_id, false).token || null;
    } catch (e) {
      console.error("[booking-create] カウンセリングシートのトークンを作れませんでした", e.message);
    }
  }

  console.log("[booking-create] 予約登録", JSON.stringify({ customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id, change_cancelled: changeCancelled, needs_intake: needsIntake, intake_token: !!intakeToken }));
  return NextResponse.json({
    ok: true, customer_id: c.id, booking_id: b1.id, booking2_id: booking2Id, change_cancelled: changeCancelled, needs_intake: needsIntake,
    ...(intakeToken ? { intake_token: intakeToken } : {}),
  });
}
