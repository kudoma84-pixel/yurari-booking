import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const { to, subject, html } = await request.json();
  
  try {
    const data = await resend.emails.send({
      from: '癒楽里 <noreply@seitai-yurari.com>',
      to,
      subject,
      html,
    });
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error }, { status: 500 });
  }
}
