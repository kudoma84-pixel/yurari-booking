import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SUPABASE_URL, sbHeaders, sbSelect, q, verifyLineSignature } from "../_lib/server";

// 1イベント分の保存。LINEの再送で同じ webhookEventId が来た場合は UNIQUE 制約で弾かれるのでスキップ扱い
async function saveEvent(event) {
  if (event.type !== "message" || event.message?.type !== "text") return;

  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  const message = event.message.text;
  const webhookEventId = event.webhookEventId || null;

  const customers = await sbSelect(
    `customers?line_user_id=eq.${q(lineUserId)}&select=id&limit=1`
  );
  const customerId = customers.length > 0 ? customers[0].id : null;

  const row = {
    line_user_id: lineUserId,
    customer_id: customerId,
    direction: "inbound",
    message,
    is_read: false,
    webhook_event_id: webhookEventId,
  };
  const insert = (data) => fetch(`${SUPABASE_URL}/rest/v1/line_messages`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });

  // [debug] 原因調査用の一時ログ（webhook_event_id が null になる件）。確認後に削除する
  console.log("[line-webhook][debug] webhookEventId:", event.webhookEventId, "deliveryContext:", JSON.stringify(event.deliveryContext));

  let res = await insert(row);
  console.log("[line-webhook][debug] INSERT status:", res.status);
  if (res.ok) return;

  let text = await res.text();
  let code = null;
  try { code = JSON.parse(text)?.code; } catch {}
  // webhook_event_id カラム未追加（SQL未実行）の場合はカラムなしで従来どおり保存
  if (code === "PGRST204") {
    console.warn("[line-webhook][debug] PGRST204 のためカラムなしで再INSERT:", text);
    const { webhook_event_id, ...legacyRow } = row;
    res = await insert(legacyRow);
    console.log("[line-webhook][debug] 再INSERT status:", res.status);
    if (res.ok) return;
    text = await res.text();
    code = null;
    try { code = JSON.parse(text)?.code; } catch {}
  }
  if (res.status === 409 || code === "23505") {
    console.log("[line-webhook] 再送された重複イベントのためスキップ", webhookEventId);
    return;
  }
  console.error("[line-webhook] 保存失敗", res.status, text);
}

async function processEvents(events) {
  for (const event of events) {
    try {
      await saveEvent(event);
      console.log("[line-webhook][debug] バックグラウンド処理完了");
    } catch (e) {
      console.error("[line-webhook] イベント処理エラー", e);
    }
  }
}

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
    // [debug] 原因調査用の一時ログ。どのビルドが応答しているか・waitUntil が関数か確認する
    console.log("[line-webhook][debug] commit:", process.env.VERCEL_GIT_COMMIT_SHA, "events:", events.length, "waitUntil:", typeof waitUntil);

    // LINEのタイムアウトによる再送を防ぐため、保存を待たずに200を返す。
    // waitUntil により応答後も関数の実行は保存完了まで継続される（Vercel）
    waitUntil(processEvents(events));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[line-webhook] エラー", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
