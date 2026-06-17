import { NextResponse } from "next/server";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

export async function POST(request) {
  try {
    const body = await request.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const lineUserId = event.source.userId;
      const message = event.message.text;

      const resCustomer = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?line_user_id=eq.${lineUserId}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
      );
      const customers = await resCustomer.json();
      const customerId = customers && customers.length > 0 ? customers[0].id : null;

      await fetch(`${SUPABASE_URL}/rest/v1/line_messages`, {
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
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
