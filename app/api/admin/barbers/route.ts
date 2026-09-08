import { requireAdmin } from '@/lib/admin-auth';
import { appendValues, getBarbers, updateCell } from '@/lib/google-sheets';
export async function GET(request: Request) {
  try { requireAdmin(request); return Response.json({ barbers: await getBarbers() }); }
  catch (e) { return e instanceof Response ? e : Response.json({ error: 'เชื่อมต่อชีตไม่สำเร็จ' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const data = await request.json();
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 80 || typeof data.role !== 'string' || data.role.length > 120 || typeof data.target !== 'string' || (data.target && !/^[UCR][0-9a-f]{32}$/.test(data.target)) || typeof data.active !== 'boolean') return Response.json({ error: 'ตรวจชื่อ ตำแหน่ง และ LINE ID (U/C/R ตามด้วย 32 ตัวอักษร)' }, { status: 400 });
    if (data.id) {
      const barber = (await getBarbers()).find(b => b.id === data.id);
      if (!barber) return Response.json({ error: 'ไม่พบช่าง' }, { status: 404 });
      await updateCell('Barbers', barber.row, 'B', data.name.trim());
      await updateCell('Barbers', barber.row, 'C', data.role.trim());
      await updateCell('Barbers', barber.row, 'D', data.target);
      await updateCell('Barbers', barber.row, 'E', String(data.active));
    } else {
      await appendValues('Barbers', [crypto.randomUUID(), data.name.trim(), data.role.trim(), data.target, data.active]);
    }
    return Response.json({ ok: true });
  } catch (e) { return e instanceof Response ? e : Response.json({ error: 'บันทึกไม่สำเร็จ กรุณาโหลดรายการใหม่แล้วตรวจข้อมูล' }, { status: 500 }); }
}
