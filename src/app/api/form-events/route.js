import { NextResponse } from "next/server";
import { SUPABASE_URL } from "../_lib/server";
import { serviceRoleHeaders } from "../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// 予約フォームの「入口に着いた（arrive）／予約が確定した（done）」を、同じセッション単位で1回ずつ記録する。
// 素直な通過率（done ÷ arrive）を出すため。予約の確定数そのものは bookings から出せるが、LINE経由や予約変更が混ざるため別に持つ。
//   ・テーブル public.form_events（kind・session_key・route・created_at）。(session_key, kind) に一意制約がある
//   ・RLS で公開キーからは触れない。ここ（サービスロール）からだけ書く
//   ・一意制約に当たったら何もしない（on conflict do nothing）
//   ・記録は予約の邪魔をしてはいけないので、設定不備や書き込み失敗でもエラーにしない（記録は諦めてログだけ残す）
//   ・返すのは { ok: true } だけ（件数などは返さない）
const KINDS = ["arrive", "done"];
const ok = () => NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
const bad = () => NextResponse.json({ error: "invalid" }, { status: 400 });

export async function POST(request) {
  let body;
  try {
    const text = await request.text();
    if (text.length > 1000) return bad();
    body = JSON.parse(text);
  } catch {
    return bad();
  }
  const { kind, session_key: sessionKey, route } = body || {};
  if (!KINDS.includes(kind)) return bad();
  if (typeof sessionKey !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(sessionKey)) return bad();
  if (typeof route !== "string" || route.length > 128) return bad();

  const headers = serviceRoleHeaders();
  if (!headers) return ok(); // サービスロールキーが無ければ記録は諦める（エラーにしない）

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/form_events?on_conflict=session_key,kind`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ kind, session_key: sessionKey, route }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[form-events] 記録に失敗", res.status, (await res.text().catch(() => "")).slice(0, 200));
  } catch (e) {
    console.error("[form-events] 記録に失敗", e.message);
  }
  return ok();
}
