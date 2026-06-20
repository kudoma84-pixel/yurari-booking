import { NextResponse } from "next/server";
import webpush from "web-push";

const SUPABASE_URL = "https://pbjekdzmvjqhqbbrzbfk.supabase.co";
const SUPABASE_KEY = "sb_publishable_I_98PawL-eNS__SZa0DlPA_80VwFUZc";

webpush.setVapidDetails(
  "mailto:info@seitai-yurari.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const { customer_id, title, body, url } = await request.json();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?customer_id=eq.${customer_id}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }
    );
    const subscriptions = await res.json();

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url, badge: 1 })
        );
      } catch (e) {
        if (e.statusCode === 410) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
            method: "DELETE",
            headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
