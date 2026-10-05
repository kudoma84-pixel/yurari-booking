import { NextResponse } from "next/server";
import {
  requireServiceHeaders, sbFetch, mypageCustomer, verifiedLineUserId, pickFormCustomer, isSafeId,
} from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約変更（/src?change=予約ID）の元予約と、その顧客情報を返す。
// 従来は予約IDさえあれば誰でも顧客情報を取得できたため、本人確認を必須にする：
//   マイページのセッションの顧客、または検証済みLINEユーザーIDの顧客が、その予約の顧客と一致すること。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const bookingId = request.nextUrl.searchParams.get("id");
  if (!isSafeId(bookingId)) return NextResponse.json({ error: "id が不正です" }, { status: 400 });

  try {
    const rows = await sbFetch(s.headers, `bookings?id=eq.${bookingId}&select=id,customer_id,status,customers(*)`);
    const booking = Array.isArray(rows) ? rows[0] : null;
    if (!booking || !booking.customers) return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    const owner = booking.customers;

    const me = await mypageCustomer(request, s.headers);
    const lineUserId = me ? null : await verifiedLineUserId(request);
    const isOwner = (me && String(me.id) === String(booking.customer_id))
      || (!!lineUserId && !!owner.line_user_id && lineUserId === owner.line_user_id);
    if (!isOwner) {
      return NextResponse.json({ error: "この予約を変更する権限がありません" }, { status: 403 });
    }
    if (owner.is_deleted === true) return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
    return NextResponse.json({ booking: { id: booking.id, status: booking.status }, customer: pickFormCustomer(owner) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[booking-form/change-source]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
