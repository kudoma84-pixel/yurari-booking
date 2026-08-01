import { NextResponse } from "next/server";
import { SUPABASE_URL, sbHeaders, sbSelect, q } from "../_lib/server";

export async function POST(request) {
  try {
    const { subscription, customer_id } = await request.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "subscription が不正です" }, { status: 400 });
    }
    if (!customer_id) {
      return NextResponse.json({ error: "customer_id は必須です" }, { status: 400 });
    }

    // 実在する顧客IDのみ受け付ける（存在しないIDでの登録を弾く）
    const customer = await sbSelect(`customers?id=eq.${q(customer_id)}&select=id&limit=1`);
    if (customer.length === 0) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
    }

    // 同じ端末（endpoint）の重複登録を防ぐ
    const existing = await sbSelect(
      `push_subscriptions?endpoint=eq.${q(endpoint)}&select=id,customer_id&limit=1`
    );
    if (existing.length > 0) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${q(existing[0].id)}`, {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({ customer_id, p256dh, auth }),
      });
      if (!res.ok) {
        console.error("[push-subscribe] 更新失敗", res.status, await res.text());
        return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, updated: true });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ customer_id, endpoint, p256dh, auth }),
    });
    if (!res.ok) {
      console.error("[push-subscribe] 登録失敗", res.status, await res.text());
      return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-subscribe] エラー", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
