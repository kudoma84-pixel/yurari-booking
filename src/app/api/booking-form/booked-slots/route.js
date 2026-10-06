import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId, isDate, pickFields } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 休憩解放のフラグ（13:30・14:00・14:30 の枠を開けるか）。
const EXTENSION_FIELDS = ["break_released_1330", "break_released_1400", "break_released_1430"];
// ブロックは「どのスタッフ（"all" は全員）の何時か」だけ。
const BLOCK_FIELDS = ["staff_id", "block_time"];

// 指定日の空き枠判定の材料：予約済みの時間帯・休憩解放・ブロック。
// 予約は「開始時刻」と「所要時間」だけを返す（誰の予約か・どのコースかは返さない）。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const p = request.nextUrl.searchParams;
  const storeId = p.get("store_id");
  const staffId = p.get("staff_id");
  const date = p.get("date");
  if (!isSafeId(storeId) || !isSafeId(staffId) || !isDate(date)) {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }
  const staffFilter = staffId === "any" ? "" : `&staff_id=eq.${staffId}`;
  try {
    const [bookings, extensions, blocks] = await Promise.all([
      sbFetch(s.headers, `bookings?store_id=eq.${storeId}${staffFilter}&booking_date=eq.${date}&status=in.(confirmed,received,treatment_done)&select=booking_time,course_id,course_duration`),
      sbFetch(s.headers, `time_extensions?store_id=eq.${storeId}&extension_date=eq.${date}&order=created_at.desc&limit=1`),
      sbFetch(s.headers, `blocks?store_id=eq.${storeId}&block_date=eq.${date}`),
    ]);
    const rows = Array.isArray(bookings) ? bookings : [];
    // 予約に所要時間が入っていない場合は、従来画面側で行っていたのと同じく
    // 公開中コースの所要時間で補う（コースIDを画面に渡さないためサーバーで解決する）。
    let courses = [];
    if (rows.some((b) => !b.course_duration)) {
      try {
        const r = await sbFetch(s.headers, "course_menus?is_active=eq.true");
        courses = Array.isArray(r) ? r : [];
      } catch (e) {
        // 取得できなくても空き枠は返す（画面側は所要時間なしを30分として扱う。従来の画面と同じ）
        console.error("[booking-form/booked-slots] コースの所要時間の取得に失敗", e.message);
      }
    }
    const slots = rows.map((b) => ({
      booking_time: b.booking_time,
      course_duration: b.course_duration || courses.find((c) => c.id === b.course_id)?.duration || null,
    }));
    const ext = Array.isArray(extensions) ? extensions[0] || null : null;
    return NextResponse.json({
      bookings: slots,
      extension: ext ? pickFields(ext, EXTENSION_FIELDS) : null,
      blocks: Array.isArray(blocks) ? blocks.map((r) => pickFields(r, BLOCK_FIELDS)) : [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/booked-slots]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
