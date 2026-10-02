import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

// リマインドの通知方法の変更（本人分のみ）
const METHODS = ["line", "email", "none"];

export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;

  let method;
  try {
    ({ method } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!METHODS.includes(method)) {
    return NextResponse.json({ error: "通知方法が不正です" }, { status: 400 });
  }
  // LINE通知はLINE連携（/api/mypage/line-link）が済んでいる場合のみ
  if (method === "line" && !customer.line_user_id) {
    return NextResponse.json({ error: "LINE連携が必要です" }, { status: 400 });
  }

  try {
    await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer.id)}`, {
      method: "PATCH", body: JSON.stringify({ notification_method: method }),
    });
    return NextResponse.json({ ok: true, notification_method: method });
  } catch (e) {
    console.error("[mypage-notification-method]", e.message);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
