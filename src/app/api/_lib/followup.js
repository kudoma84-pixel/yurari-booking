// 来院日を起点にしたフォロー配信。
//   first_next_day : 初回来院（会計済）の翌日 … お礼とセルフケア
//   day21          : 最終来院から21日後、次の予約がない方 … 体調うかがい
//   day45          : 最終来院から45日後、次の予約がない方 … 再見料（2か月以上あいた場合 +2,000円）の前のご案内
//
// 安全装置
//   ・2026-10-13 から本番送信を開始（オーナー承認）。止めたいときは環境変数 FOLLOWUP_ENABLED=0 にして再公開すると、対象者の記録だけ（ドライラン）に戻る。
//   ・followup_logs テーブルが無いときも送らない（二重送信を防げないため）。
//   ・通知方法が「なし」のお客様には送らない。
//   ・送信に失敗した分は followup_logs の channel を line_failed / email_failed にする（送信済みに見せない）。
//
// 実行：外部の cron サービスから /api/followup を毎日1回呼ぶ（/api/remind からは呼ばない）。
import { SUPABASE_URL, sbHeaders, sbSelect, q, jstDateString, contactChannel, sendEmail } from "./server";

const BOOKING_URL = "https://liff.line.me/2010179815-wwzNljOX";
const UPCOMING_STATUSES = "(pending,confirmed,received,treatment_done)";

const storeLabel = (storeId) => (storeId === "toda" ? "戸田院" : "南浦和院");

// YYYY-MM-DD に月数を足して M月D日 を返す（月末は丸める）
function addMonthsLabel(dateStr, months, minusDays = 0) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay) - minusDays);
  return `${target.getUTCMonth() + 1}月${target.getUTCDate()}日`;
}

export function buildMessage(kind, { name, storeId, visitDate }) {
  const who = name ? `${name}様\n` : "";
  if (kind === "first_next_day") {
    return (
      `${who}昨日は整体院 癒楽里（${storeLabel(storeId)}）にお越しいただき、ありがとうございました。\n\n` +
      "施術後1〜2日は、体がだるく感じたり眠くなったりすることがあります。お水を多めに飲んで、ゆっくりお過ごしください。\n" +
      "出来れば、ぬるめのお湯で20分程度の入浴をお勧めします。\n\n" +
      "整えた状態を体に覚えてもらうには、最初のうちは間をあけすぎないことが大切です。次回のご予約はこちらから👇\n" +
      `${BOOKING_URL}\n\n` +
      "気になることがあれば、このトークでお気軽にご相談ください。"
    );
  }
  if (kind === "day21") {
    return (
      `${who}整体院 癒楽里です。前回のご来院から3週間ほど経ちましたが、お体の調子はいかがですか？\n\n` +
      "肩や腰の張りが戻ってきたと感じたら、早めのメンテナンスがおすすめです。\n" +
      `ご予約はこちらから👇\n${BOOKING_URL}`
    );
  }
  if (kind === "day45") {
    const until = addMonthsLabel(visitDate, 2, 1);
    return (
      `${who}整体院 癒楽里です。前回のご来院から1か月半ほど経ちました。\n\n` +
      "最終来院日から2か月以上あくと、再見料（2,000円）がかかります。" +
      `${until}までにご来院いただければ再見料はかかりません。\n` +
      `ご予約はこちらから👇\n${BOOKING_URL}`
    );
  }
  throw new Error("unknown kind " + kind);
}

// 会計済の来院記録を取得
async function completedVisits(filter) {
  return sbSelect(
    `bookings?status=eq.completed&${filter}` +
      `&select=customer_id,booking_date,store_id,customers(id,name,line_user_id,email,notification_method)`
  );
}

async function idsWithAny(path) {
  const rows = await sbSelect(path);
  return new Set(rows.map((r) => String(r.customer_id)));
}

const inList = (ids) => `(${ids.map((id) => q(id)).join(",")})`;

// 対象者を洗い出す（送信はしない）
export async function findFollowupTargets() {
  const today = jstDateString(0);
  const yesterday = jstDateString(-1);
  const d21 = jstDateString(-21);
  const d45 = jstDateString(-45);
  const targets = [];

  // 1) 初回来院の翌日
  const ys = (await completedVisits(`booking_date=eq.${q(yesterday)}`)).filter((b) => b.customer_id);
  if (ys.length) {
    const ids = [...new Set(ys.map((b) => String(b.customer_id)))];
    const before = await idsWithAny(
      `bookings?status=eq.completed&booking_date=lt.${q(yesterday)}&customer_id=in.${inList(ids)}&select=customer_id`
    );
    for (const b of ys) {
      if (before.has(String(b.customer_id))) continue;
      if (targets.some((t) => t.customerId === String(b.customer_id) && t.kind === "first_next_day")) continue;
      targets.push({ kind: "first_next_day", customerId: String(b.customer_id), visitDate: yesterday, storeId: b.store_id, customer: b.customers });
    }
  }

  // 2) 21日後 / 45日後（その日以降に来院も予約もない方）
  for (const [kind, date] of [["day21", d21], ["day45", d45]]) {
    const rows = (await completedVisits(`booking_date=eq.${q(date)}`)).filter((b) => b.customer_id);
    if (!rows.length) continue;
    const ids = [...new Set(rows.map((b) => String(b.customer_id)))];
    const later = await idsWithAny(
      `bookings?status=eq.completed&booking_date=gt.${q(date)}&customer_id=in.${inList(ids)}&select=customer_id`
    );
    const upcoming = await idsWithAny(
      `bookings?status=in.${UPCOMING_STATUSES}&booking_date=gte.${q(today)}&customer_id=in.${inList(ids)}&select=customer_id`
    );
    const seen = new Set();
    for (const b of rows) {
      const id = String(b.customer_id);
      if (later.has(id) || upcoming.has(id) || seen.has(id)) continue;
      seen.add(id);
      targets.push({ kind, customerId: id, visitDate: date, storeId: b.store_id, customer: b.customers });
    }
  }

  // 通知手段のない方は除く
  return targets.map((t) => {
    return { ...t, channel: contactChannel(t.customer) };
  });
}

async function alreadySent(t) {
  const rows = await sbSelect(
    `followup_logs?customer_id=eq.${q(t.customerId)}&kind=eq.${q(t.kind)}&visit_date=eq.${q(t.visitDate)}&channel=not.in.${RETRYABLE_CHANNELS}&select=id&limit=1`
  );
  return rows.length > 0;
}

// 送信済みとみなさない記録：試運転（dry_run）と送信失敗（line_failed / email_failed）。
// 本番送信のときはこれらの行を消してから記録し直す（失敗した分は、同じ日にもう一度実行すれば再送される）。
const RETRYABLE_CHANNELS = "(dry_run,line_failed,email_failed)";
async function deleteRetryableRow(t) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/followup_logs?customer_id=eq.${q(t.customerId)}&kind=eq.${q(t.kind)}&visit_date=eq.${q(t.visitDate)}&channel=in.${RETRYABLE_CHANNELS}`,
    { method: "DELETE", headers: sbHeaders }
  ).catch(() => {});
}

// 送信に失敗した記録を残す（送れていないのに送信済みに見えないように）
async function markFailed(t) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/followup_logs?customer_id=eq.${q(t.customerId)}&kind=eq.${q(t.kind)}&visit_date=eq.${q(t.visitDate)}&channel=eq.${q(t.channel)}`,
    { method: "PATCH", headers: { ...sbHeaders, Prefer: "return=minimal" }, body: JSON.stringify({ channel: t.channel + "_failed" }) }
  ).catch((e) => console.error("[followup] 送信失敗の記録に失敗", t.customerId, e.message));
}

async function recordDryRun(t) {
  // 同じ対象を何度記録しても1行のまま（重複は無視）
  await fetch(`${SUPABASE_URL}/rest/v1/followup_logs?on_conflict=customer_id,kind,visit_date`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ customer_id: t.customerId, kind: t.kind, visit_date: t.visitDate, channel: "dry_run" }),
  }).catch((e) => console.error("[followup] 試運転の記録に失敗", e.message));
}

async function recordSent(t) {
  await deleteRetryableRow(t);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/followup_logs`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ customer_id: t.customerId, kind: t.kind, visit_date: t.visitDate, channel: t.channel }),
  });
  // 409 = 別の実行が先に記録した（重複）。それ以外の失敗はエラー
  if (!res.ok && res.status !== 409) throw new Error(`followup_logs ${res.status}: ${await res.text()}`);
  return res.ok;
}

export async function runFollowups() {
  const targets = await findFollowupTargets();
  const enabled = process.env.FOLLOWUP_ENABLED !== "0";

  let logsReady = true;
  try {
    await sbSelect("followup_logs?select=id&limit=1");
  } catch {
    logsReady = false;
  }

  const summary = targets.map((t) => ({
    kind: t.kind,
    customer: t.customer?.name || t.customerId,
    visitDate: t.visitDate,
    channel: t.channel || "none",
  }));

  console.log("[followup] 対象", JSON.stringify(summary));

  if (!enabled || !logsReady) {
    // 試運転でも、テーブルがあれば対象者を記録しておく（Vercelのログは1時間ほどで消えるため）
    if (logsReady) for (const t of targets) await recordDryRun(t);
    return {
      dryRun: true,
      reason: !logsReady ? "followup_logs テーブルがありません（sql/2026-10-followup-logs.sql を実行してください）" : "FOLLOWUP_ENABLED=0 のため停止中です",
      targets: summary,
    };
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const t of targets) {
    if (!t.channel) { skipped++; continue; }
    let recorded = false;
    try {
      if (await alreadySent(t)) { skipped++; continue; }
      // 先に記録してから送る（同時実行で二重に送らないため）
      if (!(await recordSent(t))) { skipped++; continue; }
      recorded = true;
      let text = buildMessage(t.kind, { name: t.customer?.name, storeId: t.storeId, visitDate: t.visitDate });
      if (t.channel === "email") {
        text = text.replace("このトークでお気軽にご相談ください。", "お電話（南浦和院 048-762-8333／戸田院 048-287-3318）でお気軽にご相談ください。");
      }
      if (t.channel === "line") {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOKEN },
          body: JSON.stringify({ to: t.customer.line_user_id, messages: [{ type: "text", text }] }),
        });
        if (!res.ok) throw new Error(`LINE ${res.status}: ${await res.text()}`);
      } else if (t.channel === "email") {
        // APIキー未設定・送信エラーは sendEmail が例外にする（以前は送れていなくても送信済みになっていた）
        await sendEmail({
          to: t.customer.email,
          subject: "整体院 癒楽里からのご案内",
          html: "<div style='font-family:sans-serif;padding:20px;line-height:1.7'>" + text.replace(/\n/g, "<br>") + "</div>",
        });
      }
      sent++;
    } catch (e) {
      failed++;
      console.error("[followup] 配信失敗", t.kind, t.customerId, e.message);
      if (recorded) await markFailed(t);
    }
  }
  return { dryRun: false, sent, skipped, failed, targets: summary };
}
