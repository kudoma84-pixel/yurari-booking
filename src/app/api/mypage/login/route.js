import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../../_lib/server";
import {
  SESSION_COOKIE, sessionCookieOptions, serviceRoleHeaders, createSessionToken, recordAttemptAndCheckLimit, deleteOldAttempts,
} from "../../_lib/mypage-auth";

// マイページのログイン。「携帯下4桁＋誕生日MMDD」の8桁コードをサーバー側で照合する。
// 失敗理由（該当なし／複数該当／形式不正）は区別せず、すべて同じメッセージで返す。
const FAIL_MESSAGE = "コードが正しくありません";
const PAGE_SIZE = 1000; // Supabase の1リクエスト最大件数

export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[mypage-login] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }

  const limited = await recordAttemptAndCheckLimit(request, headers);
  await deleteOldAttempts(headers);
  if (limited) {
    return NextResponse.json({ error: "試行回数が多すぎます。10分ほど時間をおいてからお試しください" }, { status: 429 });
  }

  let code;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: FAIL_MESSAGE }, { status: 400 });
  }
  const clean = typeof code === "string" ? code.replace(/[^0-9]/g, "") : "";
  if (clean.length !== 8) {
    return NextResponse.json({ error: FAIL_MESSAGE }, { status: 400 });
  }
  const telLast4 = clean.slice(0, 4);
  const birthMMDD = clean.slice(4, 8);

  // 照合条件は従来のマイページと同じ（電話番号の数字だけの下4桁＋誕生日のMMDD）。
  // 削除済み（統合された側）の顧客は照合しない（統合後に「複数該当」でログインできなくなるため）。
  // 照合に必要な列だけを取得し、結果はブラウザに返さない。
  const hits = [];
  try {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?select=id,tel,birthday&is_deleted=not.is.true&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`,
        { headers }
      );
      if (!res.ok) throw new Error(`customers ${res.status}`);
      const rows = await res.json();
      for (const c of rows) {
        const telMatch = c.tel && String(c.tel).replace(/[^0-9]/g, "").slice(-4) === telLast4;
        const bdMatch = c.birthday && String(c.birthday).replace(/-/g, "").slice(4, 8) === birthMMDD;
        if (telMatch && bdMatch) hits.push(c.id);
      }
      if (rows.length < PAGE_SIZE) break;
    }
  } catch (e) {
    console.error("[mypage-login] 顧客の照合に失敗しました:", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }

  // 1件に特定できたときだけ成功。複数該当は別人のマイページに入るのを防ぐため採用しない。
  if (hits.length !== 1) {
    return NextResponse.json({ error: FAIL_MESSAGE }, { status: 401 });
  }

  const customerRes = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(hits[0])}&select=*`,
    { headers }
  );
  const rows = customerRes.ok ? await customerRes.json() : [];
  const customer = Array.isArray(rows) ? rows[0] : null;
  const token = customer ? createSessionToken(customer.id) : null;
  if (!token) {
    console.error("[mypage-login] セッションを発行できませんでした");
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }

  const response = NextResponse.json({ name: customer.name || "", customer_number: customer.customer_number ?? null });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
