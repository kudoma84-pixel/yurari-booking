import { NextResponse } from "next/server";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

export async function POST(request) {
  try {
    const { subscription, customer_id } = await request.json();
    const { endpoint, keys: { p256dh, auth } } = subscription;

        // 新規登録
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ customer_id, endpoint, p256dh, auth }),
    });
    const data = await res.json();
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUSH SUBSCRIBE ERROR:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
