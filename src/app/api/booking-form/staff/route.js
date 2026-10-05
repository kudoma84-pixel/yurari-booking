import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 店舗の在籍スタッフ一覧。返す項目の絞り込みは 1-D で行う。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (!isSafeId(storeId)) return NextResponse.json({ error: "store_id が不正です" }, { status: 400 });
  try {
    const rows = await sbFetch(s.headers, `staff_members?store_id=eq.${storeId}&is_active=eq.true&order=sort_order.asc`);
    return NextResponse.json({ staff: Array.isArray(rows) ? rows : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/staff]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
