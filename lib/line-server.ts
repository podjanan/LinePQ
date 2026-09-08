import { env } from 'cloudflare:workers';

type LineIdTokenResult = { sub?: string; name?: string; picture?: string; error?: string; error_description?: string };

export async function requireLineUser(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) throw new Response('กรุณาเปิดผ่าน LINE และเข้าสู่ระบบ', { status: 401 });
  if (!env.LINE_CHANNEL_ID) throw new Response('ระบบยังไม่ได้ตั้งค่า LINE_CHANNEL_ID', { status: 503 });

  const body = new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID });
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', { method: 'POST', body });
  const result = await response.json<LineIdTokenResult>();
  if (!response.ok || !result.sub) throw new Response(result.error_description ?? 'LINE token ไม่ถูกต้อง', { status: 401 });
  return { userId: result.sub, name: result.name ?? 'ลูกค้า', picture: result.picture ?? null };
}

export async function pushBookingConfirmation(userId: string, booking: { id: string; service: string; barber: string; date: string; time: string }) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: `จองคิวสำเร็จ ✅\n${booking.service}\n${booking.barber}\n${booking.date} เวลา ${booking.time} น.\nเลขที่ ${booking.id}` }] }),
  });
}
