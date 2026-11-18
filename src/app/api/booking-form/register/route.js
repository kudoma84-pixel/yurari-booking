import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, verifiedLine, customerByLineUserId, digits } from "../../_lib/booking-auth";
import { TERMS_VERSION } from "../../../_lib/terms";

// 予約フォームのお客様情報登録。
// - 同じ電話番号の顧客が既にいる場合は、名前・住所・メールなどを上書きしない（その顧客で予約に進む）。
//   電話番号は他人でも知り得るため、上書きを許すと他人の連絡先を書き換えられてしまう。
//   例外として、検証済みのLINEユーザーIDがあり、その顧客が未連携（line_user_id が空）の場合だけ
//   line_user_id を紐づける（連携済みの方の通知先は奪えない）。
// - 同じ電話番号の顧客が2件以上いる場合はエラー（どれにも紐づけない。9/30の誤紐付けと同じ構造を作らない）。
// - 新規作成時の LINEユーザーIDは、サーバーで検証できたものだけを保存する。
// - 既存顧客の情報は返さない（電話番号を知っているだけの人に個人情報を渡さないため）。
const REQUIRED = ["name", "kana", "tel", "email", "address", "zipcode", "birthday"];
const MAX_LENGTH = 200;
const METHODS = ["line", "email", "none"];

// 予約前の同意（/first の②はじめにお読みください）。画面から { version, agreed_at } が届いたときだけ、
// 顧客が確定した時点（新規登録・電話番号での照合）で customers.terms_version・terms_agreed_at に保存する。
//   ・版は今の TERMS_VERSION と同じものだけ受け付ける
//   ・時刻は画面で同意した時刻。読めない・未来すぎる・古すぎる場合はサーバーの今の時刻にする
//   ・保存に失敗しても登録・予約は止めない（ログに残すだけ）
// /src からは terms が届かないので、今までどおり何もしない。
function termsToSave(t) {
  if (!t || typeof t !== "object" || t.version !== TERMS_VERSION) return null;
  const now = Date.now();
  const at = typeof t.agreed_at === "string" ? Date.parse(t.agreed_at) : NaN;
  const ok = Number.isFinite(at) && at <= now + 5 * 60 * 1000 && at >= now - 24 * 60 * 60 * 1000;
  return { terms_version: TERMS_VERSION, terms_agreed_at: new Date(ok ? at : now).toISOString() };
}
async function saveTerms(headers, customerId, terms) {
  if (!terms) return;
  try {
    await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customerId)}`, {
      method: "PATCH", prefer: "return=minimal", body: JSON.stringify(terms),
    });
    console.log("[booking-form/register] 同意を保存しました", JSON.stringify({ customer_id: customerId, version: terms.terms_version }));
  } catch (e) {
    console.error("[booking-form/register] 同意の保存に失敗しました（登録は続けます）", JSON.stringify({ customer_id: customerId, error: e.message }));
  }
}

export async function POST(request) {
  const s = requireServiceHeaders();
  if (s.error) return s.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const f = {};
  for (const k of REQUIRED) {
    const v = body?.[k];
    if (typeof v !== "string" || !v.trim() || v.length > MAX_LENGTH) {
      return NextResponse.json({ error: "全ての項目を入力してください" }, { status: 400 });
    }
    f[k] = k === "tel" ? v.trim() : v;
  }
  // 電話番号が空（記号のみ）なら照合しない。空のまま検索すると電話番号が空の別の顧客がヒットしてしまう
  if (digits(f.tel).length === 0) {
    return NextResponse.json({ error: "電話番号を入力してください" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birthday)) {
    return NextResponse.json({ error: "生年月日が正しくありません" }, { status: 400 });
  }
  const notificationMethod = METHODS.includes(body?.notification_method) ? body.notification_method : "email";
  const terms = termsToSave(body?.terms);

  try {
    // 照合条件は従来と同じ（電話番号の完全一致）。削除済みの顧客は対象外
    const existing = await sbFetch(s.headers,
      `customers?tel=eq.${encodeURIComponent(f.tel)}&is_deleted=not.is.true&select=id,line_user_id`);
    const hits = Array.isArray(existing) ? existing : [];
    console.log("[booking-form/register] 電話番号で照合", JSON.stringify({ hits: hits.length }));

    if (hits.length > 1) {
      return NextResponse.json({
        error: "同じ電話番号のお客様が複数登録されているため、ご本人を特定できませんでした。お手数ですが店舗までお電話ください。",
      }, { status: 409 });
    }
    const line = await verifiedLine(request);
    const lineUserId = line?.lineUserId || null;

    if (hits.length === 1) {
      // 既存の方：名前・住所・メールなどは上書きしない。予約登録（booking-create）は電話番号の一致で本人確認する。
      const existing = hits[0];
      let linked = false;
      // LINEの紐づけだけは、次の条件をすべて満たす場合に限り行う：
      //   検証済みのLINEユーザーIDがある／電話番号が完全一致する顧客が1人だけ（ここまでで確定）／
      //   その顧客の line_user_id がまだ空。
      // 連携済みの方の通知先は書き換えない（他人が電話番号を知っていても通知先を奪えない）。
      if (lineUserId && !existing.line_user_id) {
        // このLINEユーザーIDが既に別の顧客に紐づいていれば、重複させない
        const other = await customerByLineUserId(s.headers, lineUserId);
        if (other.customer || other.multiple) {
          console.error("[booking-form/register] このLINEは別の顧客に連携済みのため紐づけません", JSON.stringify({ customer_id: existing.id }));
        } else {
          const update = { line_user_id: lineUserId };
          // 通知方法はお客様が選んだ値に従う
          if (METHODS.includes(body?.notification_method)) update.notification_method = body.notification_method;
          // line_user_id が空のままの場合だけ更新する（同時実行で別のLINEが先に入っていたら何もしない）。
          // 空は NULL と空文字の両方があり得るため、照合時の値に合わせて条件を付ける
          const emptyFilter = existing.line_user_id === null ? "is.null" : "eq.";
          const updated = await sbFetch(s.headers,
            `customers?id=eq.${encodeURIComponent(existing.id)}&line_user_id=${emptyFilter}`, {
              method: "PATCH", prefer: "return=representation", body: JSON.stringify(update),
            });
          linked = Array.isArray(updated) && updated.length === 1;
          if (linked) {
            console.log("[booking-form/register] 既存顧客にLINEを紐づけました", JSON.stringify({ customer_id: existing.id, via: line.via }));
          } else {
            console.error("[booking-form/register] LINEの紐づけ対象が更新されませんでした", JSON.stringify({ customer_id: existing.id }));
          }
        }
      }
      await saveTerms(s.headers, existing.id, terms);
      return NextResponse.json({ customer_id: existing.id, existed: true, has_line: !!existing.line_user_id || linked, linked });
    }

    const created = await sbFetch(s.headers, "customers", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        name: f.name, kana: f.kana, tel: f.tel, email: f.email,
        address: f.address, zipcode: f.zipcode, birthday: f.birthday,
        notification_method: notificationMethod,
        line_user_id: lineUserId || null,
      }),
    });
    const id = Array.isArray(created) ? created[0]?.id : null;
    if (!id) throw new Error("顧客IDが返りませんでした");
    await saveTerms(s.headers, id, terms);
    return NextResponse.json({ customer_id: id, existed: false, has_line: !!lineUserId });
  } catch (e) {
    console.error("[booking-form/register]", e.message);
    return NextResponse.json({ error: "お客様情報の登録に失敗しました。入力内容をご確認のうえ、もう一度お試しください。" }, { status: 500 });
  }
}
