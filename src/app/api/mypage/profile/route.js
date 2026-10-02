import { NextResponse } from "next/server";
import { requireMypageSession, sbFetch, pickCustomerFields } from "../../_lib/mypage-auth";

// 本人のプロフィール編集。更新対象はセッションの顧客IDに固定し、更新できる項目も限定する。
const EDITABLE = ["name", "kana", "tel", "email", "address", "zipcode"];
const MAX_LENGTH = 200;

export async function POST(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const update = {};
  for (const k of EDITABLE) {
    const v = body?.[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string" || v.length > MAX_LENGTH) {
      return NextResponse.json({ error: "入力内容が不正です" }, { status: 400 });
    }
    update[k] = v;
  }
  if ("name" in update && !update.name.trim()) {
    return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
  }

  try {
    const rows = await sbFetch(headers, `customers?id=eq.${encodeURIComponent(customer.id)}`, {
      method: "PATCH", body: JSON.stringify(update), prefer: "return=representation",
    });
    const updated = Array.isArray(rows) && rows[0] ? rows[0] : { ...customer, ...update };
    return NextResponse.json({ customer: pickCustomerFields(updated) });
  } catch (e) {
    console.error("[mypage-profile]", e.message);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
