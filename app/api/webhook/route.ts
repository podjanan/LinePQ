import { registerBarberTarget, getBarbers } from '@/lib/google-sheets';

export const runtime = 'nodejs';

function toBase64(bytes: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index); return diff === 0; }

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
};

const barberCatalog: Record<string, { name: string; role: string }> = {
  non: { name: 'ช่างนนท์', role: 'Master Barber' },
  phum: { name: 'ช่างภูมิ', role: 'Senior Barber' },
  mix: { name: 'ช่างมิกซ์', role: 'Barber' },
  any: { name: 'กลุ่มช่าง', role: 'All staff' },
};

async function reply(replyToken: string, text: string) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

export async function POST(request: Request) {
  if (!process.env.LINE_CHANNEL_SECRET) return new Response('Webhook not configured', { status: 503 });
  const signature = request.headers.get('x-line-signature') ?? '';
  const body = await request.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.LINE_CHANNEL_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  if (!safeEqual(signature, expected)) return new Response('Invalid signature', { status: 401 });
  const payload = JSON.parse(body) as { events?: LineEvent[] };
  for (const event of payload.events ?? []) {
    const command = event.message?.type === 'text' ? event.message.text?.trim().match(/^ลงทะเบียนช่าง\s+([a-z0-9-]+)$/i) : null;
    if (!command || !event.replyToken) continue;
    const admins = (process.env.LINE_ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (!event.source?.userId || !admins.includes(event.source.userId)) {
      await reply(event.replyToken, 'ให้เจ้าของร้านผูก LINE ของช่างผ่านหน้าจัดการช่าง');
      continue;
    }
    const barberId = command[1].toLowerCase();
    const barber = (await getBarbers()).find(b => b.id === barberId);
    if (!barber) { await reply(event.replyToken, 'ไม่พบช่าง กรุณาเพิ่มช่างในหน้าจัดการก่อน'); continue; }
    const targetId = event.source?.groupId ?? event.source?.roomId ?? event.source?.userId ?? '';
    if (!targetId) continue;
    await registerBarberTarget(barberId, targetId);
    await reply(event.replyToken, `ลงทะเบียน ${barber.name} สำเร็จ ✅\nคิวใหม่จะส่งมาที่แชตนี้`);
  }
  return Response.json({ ok: true });
}
