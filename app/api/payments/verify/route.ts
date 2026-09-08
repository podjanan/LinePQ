import { env } from 'cloudflare:workers';
import { pushBookingConfirmation, requireLineUser } from '@/lib/line-server';

type BookingRow = { id: string; service_name: string; barber_name: string; appointment_date: string; appointment_time: string; price_satang: number };
type SlipResult = { success?: boolean; data?: { success?: boolean; message?: string; transRef?: string; amount?: number } };

export async function POST(request: Request) {
  try {
    const user = await requireLineUser(request);
    if (!env.SLIPOK_API_KEY || !env.SLIPOK_BRANCH_ID) return Response.json({ error: 'ยังไม่ได้ตั้งค่าระบบตรวจสลิป' }, { status: 503 });
    const form = await request.formData();
    const bookingValue = form.get('bookingId');
    const bookingId = typeof bookingValue === 'string' ? bookingValue : '';
    const slip = form.get('slip');
    if (!(slip instanceof File) || !slip.type.startsWith('image/') || slip.size > 10 * 1024 * 1024) return Response.json({ error: 'กรุณาแนบรูปสลิปไม่เกิน 10 MB' }, { status: 400 });
    const booking = await env.DB.prepare('SELECT b.id,b.appointment_date,b.appointment_time,s.name AS service_name,br.name AS barber_name,s.price_satang FROM bookings b JOIN services s ON s.id=b.service_id JOIN barbers br ON br.id=b.barber_id WHERE b.id=? AND b.line_user_id=?').bind(bookingId, user.userId).first<BookingRow>();
    if (!booking) return Response.json({ error: 'ไม่พบรายการจอง' }, { status: 404 });
    const amountSatang = Math.min(30000, booking.price_satang);
    const key = `slips/${booking.id}/${crypto.randomUUID()}-${slip.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    await env.FILES.put(key, slip.stream(), { httpMetadata: { contentType: slip.type } });

    const slipForm = new FormData(); slipForm.set('files', slip); slipForm.set('log', 'true'); slipForm.set('amount', String(amountSatang / 100));
    const response = await fetch(`https://api.slipok.com/api/line/apikey/${env.SLIPOK_BRANCH_ID}`, { method: 'POST', headers: { 'x-authorization': env.SLIPOK_API_KEY }, body: slipForm });
    const result = await response.json<SlipResult>();
    if (!response.ok || !result.success || !result.data?.success) return Response.json({ error: result.data?.message ?? 'สลิปไม่ผ่านการตรวจสอบ' }, { status: 422 });
    const paymentId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO payments (id,booking_id,amount_satang,slip_object_key,trans_ref,verification_status,verified_at) VALUES (?,?,?,?,?,?,?)').bind(paymentId, booking.id, amountSatang, key, result.data.transRef ?? null, 'verified', Date.now()),
      env.DB.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").bind(booking.id),
    ]);
    await pushBookingConfirmation(user.userId, { id: booking.id, service: booking.service_name, barber: booking.barber_name, date: booking.appointment_date, time: booking.appointment_time });
    return Response.json({ verified: true, bookingId: booking.id, transRef: result.data.transRef });
  } catch (error) {
    if (error instanceof Response) return error;
    const duplicate = error instanceof Error && /UNIQUE/.test(error.message);
    return Response.json({ error: duplicate ? 'สลิปนี้ถูกใช้แล้ว' : 'ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่' }, { status: duplicate ? 409 : 500 });
  }
}
