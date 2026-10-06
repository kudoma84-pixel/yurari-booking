import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, pickFields } from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約フォーム（/src）のコース選択・確認画面・所要時間の計算で使う項目だけを返す。
const COURSE_FIELDS = ["id", "name", "description", "price", "duration", "category", "is_first_only"];

// 予約フォームのコース一覧（公開中のもの）。
export async function GET() {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  try {
    const rows = await sbFetch(s.headers, "course_menus?is_active=eq.true&order=sort_order.asc");
    const courses = Array.isArray(rows) ? rows.map((r) => pickFields(r, COURSE_FIELDS)) : [];
    return NextResponse.json({ courses }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/courses]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
