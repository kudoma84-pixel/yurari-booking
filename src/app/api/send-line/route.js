import { NextResponse } from "next/server";
import { isKnownLineUser } from "../_lib/server";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON" }, { status: 400 });
  }

  const { to, messages } = payload || {};
  if (!to || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ success: false, error: "to / messages は必須です" }, { status: 400 });
  }

  // 宛先を「登録済み顧客」または「LINEで問い合わせ履歴のあるユーザー」に限定する。
  // これがないと、誰でもこのAPIを叩いて公式アカウント名義で任意の相手に送信できてしまう。
  if (!(await isKnownLineUser(to))) {
    console.warn("[send-line] 未知の宛先を拒否しました");
    return NextResponse.json({ success: false, error: "宛先が登録されていません" }, { status: 403 });
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOKEN,
      },
      body: JSON.stringify({ to, messages }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[send-line] LINE APIエラー", res.status, data);
      return NextResponse.json({ success: false, error: "送信に失敗しました" }, { status: 502 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[send-line] 送信失敗", error);
    return NextResponse.json({ success: false, error: "送信に失敗しました" }, { status: 500 });
  }
}
