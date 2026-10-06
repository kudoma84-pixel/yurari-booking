import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId, pickFields } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約フォーム（/src）のスタッフ選択で使う項目だけを返す（id は空き枠の取得、name は確認画面・通知にも使う、
// categories はメニューを担当できるかの絞り込みに使う）。
const STAFF_FIELDS = ["id", "name", "title", "categories"];

// 店舗の在籍スタッフ一覧。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (!isSafeId(storeId)) return NextResponse.json({ error: "store_id が不正です" }, { status: 400 });
  try {
    const rows = await sbFetch(s.headers, `staff_members?store_id=eq.${storeId}&is_active=eq.true&order=sort_order.asc`);
    const staff = Array.isArray(rows) ? rows.map((r) => pickFields(r, STAFF_FIELDS)) : [];
    return NextResponse.json({ staff }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/staff]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
