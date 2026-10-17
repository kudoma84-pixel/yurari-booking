import { isKnownCustomerEmail, sendEmail } from "../_lib/server";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: "invalid JSON" }, { status: 400 });
  }

  const { to, subject, html } = payload || {};
  if (!to || !subject || !html) {
    return Response.json({ success: false, error: "to / subject / html は必須です" }, { status: 400 });
  }

  // 宛先を登録済み顧客のメールアドレスに限定する。
  // これがないと、誰でもこのAPIを叩いて当院名義で任意の宛先にメールを送れてしまう。
  const recipients = Array.isArray(to) ? to : [to];
  for (const addr of recipients) {
    if (!(await isKnownCustomerEmail(addr))) {
      console.warn("[send-email] 未登録の宛先を拒否しました");
      return Response.json({ success: false, error: "宛先が登録されていません" }, { status: 403 });
    }
  }

  try {
    // 送信エラーは sendEmail が例外にする（以前は失敗しても success: true を返していた）
    const data = await sendEmail({ to, subject, html });
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("[send-email] 送信失敗", error.message);
    return Response.json({ success: false, error: "送信に失敗しました" }, { status: 500 });
  }
}
