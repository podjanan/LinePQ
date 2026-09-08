import { timingSafeEqual } from 'node:crypto';

export function requireAdmin(request: Request) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected || expected.length < 24) throw new Response('ตั้ง ADMIN_ACCESS_KEY อย่างน้อย 24 ตัวอักษรก่อนใช้งาน', { status: 503 });
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Response('รหัสเจ้าของร้านไม่ถูกต้อง', { status: 401 });
}
