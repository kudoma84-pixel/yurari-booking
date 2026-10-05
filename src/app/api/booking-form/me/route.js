import { NextResponse } from "next/server";
import {
  requireServiceHeaders, mypageCustomer, verifiedLineUserId, customerByLineUserId, pickFormCustomer,
} from "../../_lib/booking-auth";

export const dynamic = "force-dynamic";

// 予約フォームを開いたときの自動ログイン。
// 従来は localStorage の顧客ID・LINEユーザーIDをそのまま信用していたが、
// サーバー側で確認できる本人（マイページのセッション → 検証済みLINEユーザーID）だけを返す。
export async function GET(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const noStore = { headers: { "Cache-Control": "no-store" } };
  try {
    const fromMypage = await mypageCustomer(request, s.headers);
    if (fromMypage) {
      return NextResponse.json({ customer: pickFormCustomer(fromMypage), source: "mypage_session" }, noStore);
    }
    const lineUserId = await verifiedLineUserId(request);
    if (lineUserId) {
      const r = await customerByLineUserId(s.headers, lineUserId);
      if (r.multiple) console.error("[booking-form/me] 同じLINEユーザーIDの顧客が複数あるため自動ログインしません");
      if (r.customer) {
        return NextResponse.json({ customer: pickFormCustomer(r.customer), source: "verified_line" }, noStore);
      }
    }
    return NextResponse.json({ customer: null }, { status: 401, ...noStore });
  } catch (e) {
    console.error("[booking-form/me]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
