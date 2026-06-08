import { NextResponse } from "next/server";

export async function POST(request) {
  const { to, messages } = await request.json();
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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
