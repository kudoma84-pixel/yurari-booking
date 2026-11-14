import { NextResponse } from "next/server";
import { requireMypageSession, pickCustomerFields, sbFetch } from "../../_lib/mypage-auth";
import { customersNeedingIntake } from "../../_lib/intake";

export const dynamic = "force-dynamic";

// ログイン中の顧客本人の情報だけを返す。セッションが無効なら 401。
// has_intake：問診票（カウンセリングシート）が1件以上あるか。確認できなかったときは null。
// needs_intake：「カウンセリングシートのご記入をお願いします」のバナーを出すか。
//   予約確定時・前日リマインドの案内と同じ条件（customersNeedingIntake：INTAKE_START_AT 以降に登録・未記入・来院実績なし）。
//   確認できなかったときは false（バナーを出さない）。
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  let hasIntake = null;
  try {
    const rows = await sbFetch(session.headers, `intake_forms?customer_id=eq.${encodeURIComponent(session.customer.id)}&select=id&limit=1`);
    hasIntake = Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.error("[mypage-me] 問診票の有無を確認できませんでした:", e.message);
  }
  let needsIntake = false;
  if (hasIntake === false) {
    try {
      needsIntake = (await customersNeedingIntake(session.headers, [String(session.customer.id)])).has(String(session.customer.id));
    } catch (e) {
      console.error("[mypage-me] 問診票の案内の対象か確認できませんでした:", e.message);
    }
  }
  return NextResponse.json({ customer: pickCustomerFields(session.customer), has_intake: hasIntake, needs_intake: needsIntake }, { headers: { "Cache-Control": "no-store" } });
}
