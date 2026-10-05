import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約フォームのコース一覧（公開中のもの）。返す項目の絞り込みは 1-D で行う。
export async function GET() {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  try {
    const rows = await sbFetch(s.headers, "course_menus?is_active=eq.true&order=sort_order.asc");
    return NextResponse.json({ courses: Array.isArray(rows) ? rows : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/courses]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
