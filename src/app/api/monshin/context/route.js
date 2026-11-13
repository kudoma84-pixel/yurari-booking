import { NextResponse } from "next/server";
import { serviceRoleHeaders, SESSION_COOKIE, verifySessionToken } from "../../_lib/mypage-auth";
import { verifyIntakeToken, fetchCustomer, profileFromCustomer, nextBooking } from "../../_lib/intake";

export const dynamic = "force-dynamic";

// 問診票の画面を開いたときに、どの入口か（と、登録済みの方ならご登録内容）を返す。
//   k なし … マイページのセッション（A：Web予約済みの方の事前記入）。未ログインなら 401
//   k あり … 受付トークン。intake-counter（B：初めての方）／ intake-customer（C：登録済みで未記入の方）
// 問診票の中身はここでは返さない。
export async function POST(request) {
  const headers = serviceRoleHeaders();
  if (!headers || !process.env.NEXTAUTH_SECRET) {
    console.error("[monshin/context] SUPABASE_SERVICE_ROLE_KEY または NEXTAUTH_SECRET が未設定です");
    return NextResponse.json({ error: "サーバーの設定に問題があります" }, { status: 500 });
  }
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const k = typeof body?.k === "string" ? body.k : "";

  try {
    if (k) {
      const t = verifyIntakeToken(k);
      if (!t) return NextResponse.json({ error: "このページの有効期限が切れています。受付でお声がけください。", code: "expired" }, { status: 410 });
      if (t.kind === "counter") {
        return NextResponse.json({ mode: "counter", kiosk: t.kiosk, store_id: t.store, expires_at: t.exp });
      }
      const c = await fetchCustomer(headers, t.cid);
      if (!c) return NextResponse.json({ error: "ご登録が見つかりません。受付でお声がけください。", code: "expired" }, { status: 410 });
      return NextResponse.json({
        mode: "customer", kiosk: t.kiosk, store_id: t.store, expires_at: t.exp,
        profile: profileFromCustomer(c), next_booking: await nextBooking(headers, c.id).catch(() => null),
      });
    }

    const cid = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await fetchCustomer(headers, cid);
    if (!c) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({
      mode: "mypage", kiosk: false,
      profile: profileFromCustomer(c), next_booking: await nextBooking(headers, c.id).catch(() => null),
    });
  } catch (e) {
    console.error("[monshin/context]", e.message);
    return NextResponse.json({ error: "読み込みに失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}
