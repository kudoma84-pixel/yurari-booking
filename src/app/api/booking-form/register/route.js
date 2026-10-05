import { NextResponse } from "next/server";
import { requireServiceHeaders, sbFetch, verifiedLineUserId, digits } from "../../_lib/booking-auth";

// 予約フォームのお客様情報登録。
// - 同じ電話番号の顧客が既にいる場合は、その顧客の情報を一切上書きしない（その顧客で予約に進むだけ）。
//   電話番号は他人でも知り得るため、上書きや LINE の紐づけを許すと、他人の連絡先や通知先を書き換えられてしまう。
// - 同じ電話番号の顧客が2件以上いる場合はエラー（どれにも紐づけない。9/30の誤紐付けと同じ構造を作らない）。
// - 新規作成時の LINEユーザーIDは、サーバーで検証できたものだけを保存する。
// - 既存顧客の情報は返さない（電話番号を知っているだけの人に個人情報を渡さないため）。
const REQUIRED = ["name", "kana", "tel", "email", "address", "zipcode", "birthday"];
const MAX_LENGTH = 200;
const METHODS = ["line", "email", "none"];

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
    if (hits.length === 1) {
      // 既存の方：上書きしない。予約登録（booking-create）は電話番号の一致で本人確認する
      return NextResponse.json({ customer_id: hits[0].id, existed: true, has_line: !!hits[0].line_user_id });
    }

    const lineUserId = await verifiedLineUserId(request);
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
    return NextResponse.json({ customer_id: id, existed: false, has_line: !!lineUserId });
  } catch (e) {
    console.error("[booking-form/register]", e.message);
    return NextResponse.json({ error: "お客様情報の登録に失敗しました。入力内容をご確認のうえ、もう一度お試しください。" }, { status: 500 });
  }
}
