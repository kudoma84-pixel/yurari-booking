import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId, isDate, pickFields } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// カレンダーの出勤日判定に使うのは「誰が（staff_id。休院日は "closed"）いつ（work_date）出勤か」だけ。
const SHIFT_FIELDS = ["staff_id", "work_date"];

// カレンダーの出勤日判定の材料：期間内のシフトと、在籍中スタッフのID（指名なし用）。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const p = request.nextUrl.searchParams;
  const storeId = p.get("store_id");
  const from = p.get("from");
  const to = p.get("to");
  if (!isSafeId(storeId) || !isDate(from) || !isDate(to)) {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }
  try {
    const [shifts, activeStaff] = await Promise.all([
      sbFetch(s.headers, `shifts?store_id=eq.${storeId}&work_date=gte.${from}&work_date=lte.${to}`),
      sbFetch(s.headers, `staff_members?store_id=eq.${storeId}&is_active=eq.true&select=id`),
    ]);
    return NextResponse.json({
      shifts: Array.isArray(shifts) ? shifts.map((r) => pickFields(r, SHIFT_FIELDS)) : [],
      active_staff_ids: Array.isArray(activeStaff) ? activeStaff.map((r) => r.id) : [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/shifts]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
