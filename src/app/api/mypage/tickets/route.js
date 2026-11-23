import { NextResponse } from "next/server";
import { jstDateString } from "../../_lib/server";
import { requireMypageSession, sbFetch } from "../../_lib/mypage-auth";

export const dynamic = "force-dynamic";

// 本人が使える有効な金券（期限の近い順）。
// 共有グループ（share_group_id）があれば、グループ全員の金券を含める。
// 範囲と条件は管理画面の fetchCustomerTickets（会計画面・顧客詳細）と同じ：
//   本人の share_group_id → 同じグループの全員の id → その全員の status=active かつ expires_at>=今日 の金券。
//   人数の制限はない（2人組でも4人組でも、グループの全員を集める）。
// 共有相手の個人情報（氏名・電話番号・顧客IDなど）は返さない。
// 金券ごとに返すのは金券そのものの項目と、本人のものか共有のものかの印（owner: "self" | "family"）だけ。
export async function GET(request) {
  const session = await requireMypageSession(request);
  if (session.error) return session.error;
  const { headers, customer } = session;
  try {
    let idList = [customer.id];
    if (customer.share_group_id) {
      const members = await sbFetch(headers,
        `customers?share_group_id=eq.${encodeURIComponent(customer.share_group_id)}&select=id`);
      if (Array.isArray(members) && members.length > 0) {
        idList = members.map(m => m.id);
        if (!idList.includes(customer.id)) idList.push(customer.id);
      }
    }
    const idFilter = idList.length > 1
      ? `customer_id=in.(${idList.map(id => encodeURIComponent(id)).join(",")})`
      : `customer_id=eq.${encodeURIComponent(customer.id)}`;
    const rows = await sbFetch(headers,
      `gift_tickets?${idFilter}&status=eq.active&expires_at=gte.${jstDateString()}` +
      `&order=expires_at.asc&select=id,customer_id,ticket_name,ticket_type,face_value,issued_at,expires_at`);
    // customer_id は本人か共有かを判定するためだけに使い、応答には含めない
    const tickets = (Array.isArray(rows) ? rows : []).map(({ customer_id, ...t }) => ({
      ...t,
      owner: customer_id === customer.id ? "self" : "family",
    }));
    return NextResponse.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[mypage-tickets]", e.message);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
