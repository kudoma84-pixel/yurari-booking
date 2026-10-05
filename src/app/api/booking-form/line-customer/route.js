import { NextResponse } from "next/server";
import {
  requireServiceHeaders, sbFetch, verifiedLineUserId, customerByLineUserId, pickFormCustomer,
} from "../../_lib/booking-auth";

// 「LINEで登録」後の顧客照合。LINEユーザーIDはクライアントから受け取らず、
// サーバーで検証できたもの（LIFF の検証済みCookie または NextAuth のセッション）だけを使う。
export async function POST(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;

  const lineUserId = await verifiedLineUserId(request);
  if (!lineUserId) {
    return NextResponse.json({ error: "LINEの認証が確認できませんでした" }, { status: 401 });
  }

  try {
    const r = await customerByLineUserId(s.headers, lineUserId);
    // 2件以上ヒットした場合は先頭を採用しない（別人に紐づくのを防ぐ）
    if (r.multiple) {
      console.error("[booking-form/line-customer] 同じLINEユーザーIDの顧客が複数あります");
      return NextResponse.json({ error: "お客様情報を特定できませんでした。お手数ですが店舗までお電話ください。" }, { status: 409 });
    }
    if (!r.customer) {
      // 新規の方：登録画面へ（顧客はここでは作らない）
      return NextResponse.json({ found: false, line_user_id: lineUserId });
    }
    // 通知方法をLINEに（従来どおり）。line_user_id は一致しているので変更しない
    await sbFetch(s.headers, `customers?id=eq.${encodeURIComponent(r.customer.id)}`, {
      method: "PATCH", body: JSON.stringify({ notification_method: "line" }),
    });
    return NextResponse.json({ found: true, customer: pickFormCustomer({ ...r.customer, notification_method: "line" }) });
  } catch (e) {
    console.error("[booking-form/line-customer]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
