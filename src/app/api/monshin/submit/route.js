import { NextResponse } from "next/server";
import {
  serviceRoleHeaders, SESSION_COOKIE, verifySessionToken, recordAttemptAndCheckLimit, deleteOldAttempts, sbFetch,
} from "../../_lib/mypage-auth";
import { createLinkToken, LINK_TOKEN_TTL_MS } from "../../_lib/line-link-token";
import {
  verifyIntakeToken, sanitizeAnswers, sanitizeMarks, sanitizeProfile, profileFromCustomer,
  matchOrCreateCustomer, applyProfileEdit, fetchCustomer, nextBooking,
} from "../../_lib/intake";

export const dynamic = "force-dynamic";

const ASK_COUNTER = "受付でお声がけください。";

// 問診票の送信。入口は3つ（context と同じ判定）。
//   A mypage   … マイページのセッションの本人
//   B counter  … 初めての方。携帯番号で既存顧客を照合し、なければ新規登録（_lib/intake.js matchOrCreateCustomer）
//   C customer … 受付で発行した顧客限定トークンの方
// 公開エンドポイントなので、同一IPから10分で20件までに制限する（マイページのログインと同じ仕組み・別カウント）。
export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[monshin/submit] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }

  if (await recordAttemptAndCheckLimit(request, headers, "intake")) {
    return NextResponse.json({ error: "送信が続いたため、しばらく受け付けできません。" + ASK_COUNTER }, { status: 429 });
  }
  deleteOldAttempts(headers);

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (JSON.stringify(body || {}).length > 50000) return NextResponse.json({ error: "入力内容が長すぎます" }, { status: 413 });
  if (body?.consent !== true) return NextResponse.json({ error: "ご確認とご同意をお願いします" }, { status: 400 });

  // 入口の判定
  const k = typeof body?.k === "string" ? body.k : "";
  let mode, store = null, kiosk = false, customer = null;
  if (k) {
    const t = verifyIntakeToken(k);
    if (!t) return NextResponse.json({ error: "このページの有効期限が切れています。" + ASK_COUNTER, code: "expired" }, { status: 410 });
    mode = t.kind; store = t.store; kiosk = t.kiosk;
    if (t.kind === "customer") {
      customer = await fetchCustomer(headers, t.cid).catch(() => null);
      if (!customer) return NextResponse.json({ error: "ご登録が見つかりません。" + ASK_COUNTER, code: "expired" }, { status: 410 });
    }
  } else {
    const cid = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    customer = cid ? await fetchCustomer(headers, cid).catch(() => null) : null;
    if (!customer) return NextResponse.json({ error: "ログインの有効期限が切れました。マイページからもう一度お開きください。", code: "unauthorized" }, { status: 401 });
    mode = "mypage";
  }

  const a = sanitizeAnswers(body?.answers);
  if (a.error) return NextResponse.json({ error: a.error }, { status: 400 });
  const marks = sanitizeMarks(body?.marks);

  // お客様情報：初めての方は必ず入力。登録済みの方は「内容を修正する」を押したときだけ入力が来る
  const edited = mode === "counter" || body?.edited === true;
  let profile = null;
  if (edited) {
    const p = sanitizeProfile(body?.profile);
    if (p.error) return NextResponse.json({ error: p.error }, { status: 400 });
    profile = p.profile;
  }

  try {
    let existed = true;
    if (mode === "counter") {
      const r = await matchOrCreateCustomer(headers, profile);
      if (r.error === "multiple") {
        return NextResponse.json({ error: "ご本人を特定できませんでした。" + ASK_COUNTER, code: "multiple" }, { status: 409 });
      }
      customer = r.customer; existed = r.existed;
    } else if (profile) {
      const r = await applyProfileEdit(headers, customer, profile);
      if (r.error === "tel_conflict") {
        return NextResponse.json({ error: "この携帯番号は別のお客様のご登録で使われています。" + ASK_COUNTER, code: "tel_conflict" }, { status: 409 });
      }
      customer = r.customer;
    }

    // 入力されたお客様情報の控え（印刷・「登録の生年月日と相違」の表示に使う）
    const snapshot = profile ? { ...profile } : profileFromCustomer(customer);
    delete snapshot.line_linked;
    if (mode === "mypage" && !store) store = (await nextBooking(headers, customer.id).catch(() => null))?.store_id || null;

    const source = mode === "mypage" ? "mypage" : kiosk ? "counter_tablet" : "counter_phone";
    await sbFetch(headers, "intake_forms", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customer.id, store_id: store, source,
        consented_at: new Date().toISOString(),
        answers: { ...a.answers, profile: snapshot },
        marks,
      }),
    });
    console.log("[monshin/submit] 問診票を保存しました", JSON.stringify({ customer_id: customer.id, mode, source, existed }));

    // 「LINEで受け取る」を選んだ未連携の方には、受付の LINE連携QR と同じ連携URLを返す
    const wantsLine = (profile ? profile.contact : snapshot.contact) === "line";
    let lineLinkUrl = null;
    if (wantsLine && !customer.line_user_id && process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE) {
      const t = createLinkToken(customer.id);
      if (t) lineLinkUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID_MYPAGE}/link?t=${encodeURIComponent(t)}`;
    }
    return NextResponse.json({
      ok: true,
      line_link_url: lineLinkUrl,
      line_link_expires_at: lineLinkUrl ? Date.now() + LINK_TOKEN_TTL_MS : null,
      line_linked: !!customer.line_user_id,
    });
  } catch (e) {
    console.error("[monshin/submit]", e.message);
    return NextResponse.json({ error: "送信できませんでした。通信状態をご確認のうえ、もう一度「送信する」を押してください。" }, { status: 500 });
  }
}
