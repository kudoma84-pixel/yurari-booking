import { NextResponse } from "next/server";
import { SUPABASE_URL, sbHeaders, sbSelect, q, verifyLineSignature } from "../_lib/server";

export async function POST(request) {
  try {
    // 署名検証のため生ボディを取得する（JSONパースより先）
    const rawBody = await request.text();
    if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"))) {
      return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;

      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;
      const message = event.message.text;

      const customers = await sbSelect(
        `customers?line_user_id=eq.${q(lineUserId)}&select=id&limit=1`
      );
      const customerId = customers.length > 0 ? customers[0].id : null;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/line_messages`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=representation" },
        body: JSON.stringify({
          line_user_id: lineUserId,
          customer_id: customerId,
          direction: "inbound",
          message,
          is_read: false,
        }),
      });
      if (!res.ok) console.error("[line-webhook] 保存失敗", res.status, await res.text());
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[line-webhook] エラー", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
