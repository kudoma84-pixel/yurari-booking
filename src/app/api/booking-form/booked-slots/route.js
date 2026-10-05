import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId, isDate } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 指定日の空き枠判定の材料：予約済みの時間帯・休憩解放・ブロック。
// 予約は時間とコースだけを返す（誰の予約かは返さない）。さらなる絞り込みは 1-D で行う。
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
    return NextResponse.json({
      bookings: Array.isArray(bookings) ? bookings : [],
      extension: Array.isArray(extensions) ? extensions[0] || null : null,
      blocks: Array.isArray(blocks) ? blocks : [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/booked-slots]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
