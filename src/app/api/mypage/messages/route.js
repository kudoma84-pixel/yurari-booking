import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 2000;

// 本人のLINEユーザーIDのメッセージ履歴。LINEユーザーIDはクライアントからは受け取らず、DBの本人の値を使う。
async function listMessages(headers, lineUserId) {
  const rows = await sbFetch(headers,
    `line_messages?line_user_id=eq.${encodeURIComponent(lineUserId)}&order=created_at.asc&limit=100&select=id,direction,message,created_at`);
  return Array.isArray(rows) ? rows : [];
}

export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  if (!customer.line_user_id) return NextResponse.json({ messages: [] });
  try {
    return NextResponse.json({ messages: await listMessages(headers, customer.line_user_id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-messages]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}

// お客様からのメッセージ送信（LINE連携済みの方のみ。従来どおり inbound として記録する）
export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  if (!customer.line_user_id) {
    return NextResponse.json({ error: "LINE連携が必要です" }, { status: 400 });
  }

  let message;
  try {
    ({ message } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim() || message.length > MAX_LENGTH) {
    return NextResponse.json({ error: "メッセージが不正です" }, { status: 400 });
  }

  try {
    await sbFetch(headers, "line_messages", {
      method: "POST",
      body: JSON.stringify({ line_user_id: customer.line_user_id, customer_id: customer.id, direction: "inbound", message, is_read: false }),
    });
    return NextResponse.json({ messages: await listMessages(headers, customer.line_user_id) });
  } catch (e) {
    console.error("[mypage-messages-send]", e.message);
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 });
  }
}
