import { NextResponse } from "next/server";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("WEBHOOK BODY:", JSON.stringify(body));
    const events = body.events || [];

    for (const event of events) {
      console.log("EVENT TYPE:", event.type, event.message?.type);
      if (event.type !== "message" || event.message.type !== "text") continue;

      const lineUserId = event.source.userId;
      const message = event.message.text;
      console.log("LINE USER ID:", lineUserId, "MESSAGE:", message);

      // line_user_idで顧客を検索
      const resCustomer = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${lineUserId}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
      );
      const customers = await resCustomer.json();
      console.log("CUSTOMERS:", JSON.stringify(customers));
      const customerId = customers && customers.length > 0 ? customers[0].id : null;

      // line_messagesに保存
      const resInsert = await fetch(`${SUPABASE_URL}/rest/v1/line_messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          line_user_id: lineUserId,
          customer_id: customerId,
          direction: "inbound",
          message,
          is_read: false,
        }),
      });
      const insertResult = await resInsert.json();
      console.log("INSERT RESULT:", JSON.stringify(insertResult));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WEBHOOK ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
