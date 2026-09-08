import { getBarbers } from '@/lib/google-sheets';
export async function GET() {
  try { return Response.json({ barbers: (await getBarbers()).filter(b => b.active && b.id !== 'any').map(({ id, name, role }) => ({ id, name, role, skill: role, initial: name.slice(0, 1), tone: 'blue', next: '' })) }); }
  catch { return Response.json({ error: 'โหลดรายชื่อช่างไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 }); }
}
