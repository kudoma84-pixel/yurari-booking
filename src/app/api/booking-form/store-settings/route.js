import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, isSafeId, pickFields } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約フォーム（/src）が使うのは当日予約の締切時間（分）だけ。
const SETTINGS_FIELDS = ["same_day_lead_time"];

// 店舗設定（当日予約の締切時間）。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (!isSafeId(storeId)) return NextResponse.json({ error: "store_id が不正です" }, { status: 400 });
  try {
    const rows = await sbFetch(s.headers, `store_settings?store_id=eq.${storeId}`);
    const row = Array.isArray(rows) ? rows[0] || null : null;
    return NextResponse.json({ settings: row ? pickFields(row, SETTINGS_FIELDS) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/store-settings]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
