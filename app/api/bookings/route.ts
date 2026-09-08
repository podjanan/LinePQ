import { env } from 'cloudflare:workers';
import { requireLineUser } from '@/lib/line-server';

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
    const input = await request.json<{ serviceId?: string; barberId?: string; date?: string; time?: string; customerName?: string; phone?: string }>();
    const service = input.serviceId ? serviceCatalog[input.serviceId] : null;
    const barber = input.barberId ? barberCatalog[input.barberId] : null;
    if (!service || !barber || !/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') || !/^\d{2}:\d{2}$/.test(input.time ?? '') || !input.phone) return Response.json({ error: 'ข้อมูลการจองไม่ครบถ้วน' }, { status: 400 });
    const id = `TM${Date.now().toString(36).toUpperCase()}`;
    const serviceId = input.serviceId!; const barberId = input.barberId!;
    await env.DB.batch([
      env.DB.prepare("UPDATE bookings SET status='expired' WHERE status='awaiting_payment' AND created_at < ?").bind(Date.now() - 15 * 60 * 1000),
      env.DB.prepare('INSERT OR IGNORE INTO services (id,name,duration_minutes,price_satang,active) VALUES (?,?,?,?,1)').bind(serviceId, service.name, service.duration, service.price),
      env.DB.prepare('INSERT OR IGNORE INTO barbers (id,name,role,active) VALUES (?,?,?,1)').bind(barberId, barber.name, barber.role),
      env.DB.prepare('INSERT INTO bookings (id,line_user_id,customer_name,phone,service_id,barber_id,appointment_date,appointment_time,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, user.userId, input.customerName || user.name, input.phone, serviceId, barberId, input.date, input.time, 'awaiting_payment', Date.now()),
    ]);
    return Response.json({ id, deposit: Math.min(30000, service.price), status: 'awaiting_payment' }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error && /UNIQUE/.test(error.message) ? 'เวลานี้เพิ่งถูกจอง กรุณาเลือกเวลาใหม่' : 'ไม่สามารถสร้างการจองได้';
    return Response.json({ error: message }, { status: 409 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireLineUser(request);
    const result = await env.DB.prepare('SELECT b.*, s.name AS service_name, br.name AS barber_name FROM bookings b JOIN services s ON s.id=b.service_id JOIN barbers br ON br.id=b.barber_id WHERE b.line_user_id=? ORDER BY b.appointment_date DESC,b.appointment_time DESC LIMIT 20').bind(user.userId).all();
    return Response.json({ bookings: result.results });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: 'โหลดรายการจองไม่สำเร็จ' }, { status: 500 }); }
}
