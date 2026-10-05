import { NextResponse } from "next/server";
import {
  requireServiceHeaders, sbFetch, mypageCustomer, verifiedLineUserId, digits, isSafeId,
} from "../_lib/booking-auth";

// プッシュ通知の購読登録。
// 従来は localStorage の顧客IDをそのまま信用しており、他人の顧客IDで通知を登録できた。
// 登録先の顧客は次のいずれかで本人確認できた場合のみ受け付ける：
//   1) マイページのセッションの顧客（送られた customer_id があれば一致が必要）
//   2) 送られた customer_id の顧客の電話番号が、送られた tel と一致
//   3) 送られた customer_id の顧客の LINEユーザーIDが、サーバーで検証できたLINEユーザーIDと一致
export async function POST(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;
  const headers = s.headers;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { subscription, customer_id, tel } = payload || {};
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth || typeof endpoint !== "string" || !/^https:\/\//.test(endpoint)) {
    return NextResponse.json({ error: "subscription が不正です" }, { status: 400 });
  }
  if (customer_id != null && !isSafeId(customer_id)) {
    return NextResponse.json({ error: "customer_id が不正です" }, { status: 400 });
  }

  try {
    // ── 本人確認 ──
    let customerId = null;
    const me = await mypageCustomer(request, headers);
    if (me) {
      if (customer_id && String(customer_id) !== String(me.id)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      customerId = me.id;
    } else {
      if (!customer_id) return NextResponse.json({ error: "customer_id は必須です" }, { status: 400 });
      const rows = await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer_id)}&select=id,tel,line_user_id,is_deleted`);
      const c = Array.isArray(rows) ? rows[0] : null;
      if (!c || c.is_deleted === true) return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });
      const formTel = digits(tel);
      const dbTel = digits(c.tel);
      const telOk = formTel.length > 0 && dbTel.length > 0 && formTel === dbTel;
      const lineUserId = await verifiedLineUserId(request);
      const lineOk = !!lineUserId && !!c.line_user_id && lineUserId === c.line_user_id;
      if (!telOk && !lineOk) {
        console.error("[push-subscribe] 本人確認できないため拒否しました");
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      customerId = c.id;
    }

    // 同じ端末（endpoint）の重複登録を防ぐ
    const existing = await sbFetch(headers,
      `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&select=id,customer_id&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      await sbFetch(headers, `push_subscriptions?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: "PATCH",
        body: JSON.stringify({ customer_id: customerId, p256dh, auth }),
      });
      return NextResponse.json({ ok: true, updated: true });
    }

    await sbFetch(headers, "push_subscriptions", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({ customer_id: customerId, endpoint, p256dh, auth }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-subscribe] エラー", e.message);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
