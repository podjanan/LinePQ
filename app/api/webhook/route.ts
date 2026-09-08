import { env } from 'cloudflare:workers';

function toBase64(bytes: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function safeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index); return diff === 0; }

export async function POST(request: Request) {
  if (!env.LINE_CHANNEL_SECRET) return new Response('Webhook not configured', { status: 503 });
  const signature = request.headers.get('x-line-signature') ?? '';
  const body = await request.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.LINE_CHANNEL_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  if (!safeEqual(signature, expected)) return new Response('Invalid signature', { status: 401 });
  return Response.json({ ok: true });
}
