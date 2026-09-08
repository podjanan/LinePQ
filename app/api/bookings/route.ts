import { appendValues, getBarbers, getBarberTarget, getBookings, updateCell, upsertCatalogRow } from '@/lib/google-sheets';
import { pushLineMessage, requireLineUser } from '@/lib/line-server';

export const runtime = 'nodejs';

const serviceCatalog: Record<string, { name: string; duration: number; price: number }> = {
  cut: { name: 'ตัดผมชาย', duration: 60, price: 35000 },
  'cut-shave': { name: 'ตัด + โกนหนวด', duration: 75, price: 45000 },
  perm: { name: 'ดัดวอลลุ่มชาย', duration: 120, price: 120000 },
  color: { name: 'ทำสีแฟชั่น', duration: 180, price: 180000 },
};
const barberCatalog: Record<string, { name: string; role: string }> = {
  non: { name: 'ช่างนนท์', role: 'Master Barber' }, phum: { name: 'ช่างภูมิ', role: 'Senior Barber' },
  mix: { name: 'ช่างมิกซ์', role: 'Barber' }, any: { name: 'ช่างคนไหนก็ได้', role: 'Auto assign' },
};

export async function POST(request: Request) {
  try {
    const user = await requireLineUser(request);
    const input = await request.json() as { serviceId?: string; barberId?: string; date?: string; time?: string; customerName?: string; phone?: string };
    const service = input.serviceId ? serviceCatalog[input.serviceId] : null;
    const barber = (await getBarbers()).find(b => b.id === input.barberId && b.active && b.id !== 'any');
    if (!service || !barber || !/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') || !/^\d{2}:\d{2}$/.test(input.time ?? '') || !input.phone) return Response.json({ error: 'ข้อมูลการจองไม่ครบถ้วน' }, { status: 400 });
    const id = `TM${Date.now().toString(36).toUpperCase()}`;
    const serviceId = input.serviceId!; const barberId = input.barberId!;
    await upsertCatalogRow('Services', serviceId, [serviceId, service.name, service.duration, service.price, true]);
    const bookings = await getBookings();
    const expired = bookings.filter((item) => item.status === 'awaiting_payment' && Date.parse(item.createdAt) < Date.now() - 15 * 60 * 1000);
    await Promise.all(expired.map((item) => updateCell('Bookings', item.row, 'K', 'expired')));
    const occupied = bookings.some((item) => item.barberId === barberId && item.date === input.date && item.time === input.time && ['awaiting_payment', 'confirmed'].includes(item.status) && !expired.some((old) => old.id === item.id));
    if (occupied) return Response.json({ error: 'เวลานี้เพิ่งถูกจอง กรุณาเลือกเวลาใหม่' }, { status: 409 });
    const createdAt = new Date().toISOString();
    await appendValues('Bookings', [id, user.userId, input.customerName || user.name, input.phone, serviceId, service.name, barberId, barber.name, input.date!, input.time!, 'awaiting_payment', createdAt]);
    const target = await getBarberTarget(barberId);
    if (target) {
      await pushLineMessage(target, `มีคิวใหม่ ✂️\nสถานะ: รอชำระมัดจำ\nลูกค้า: ${input.customerName || user.name}\nโทร: ${input.phone}\nบริการ: ${service.name}\nช่าง: ${barber.name}\nวันที่ ${input.date} เวลา ${input.time} น.\nเลขที่ ${id}`).catch(console.error);
    }
    return Response.json({ id, deposit: Math.min(30000, service.price), status: 'awaiting_payment' }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return Response.json({ error: 'ไม่สามารถสร้างการจองได้ กรุณาตรวจการเชื่อมต่อ Google Sheets' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireLineUser(request);
    const bookings = (await getBookings()).filter((item) => item.lineUserId === user.userId).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).slice(0, 20).map((item) => ({
      id: item.id, customer_name: item.customerName, phone: item.phone, service_id: item.serviceId, service_name: item.serviceName,
      barber_id: item.barberId, barber_name: item.barberName, appointment_date: item.date, appointment_time: item.time, status: item.status, created_at: item.createdAt,
    }));
    return Response.json({ bookings });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: 'โหลดรายการจองไม่สำเร็จ' }, { status: 500 }); }
}
