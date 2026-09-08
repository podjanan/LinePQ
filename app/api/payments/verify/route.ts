import { put } from '@vercel/blob';
import { appendValues, getBarberTarget, getBookings, getValues, updateCell } from '@/lib/google-sheets';
import { pushBookingConfirmation, pushLineMessage, requireLineUser } from '@/lib/line-server';

export const runtime = 'nodejs';

type SlipResult = { success?: boolean; data?: { success?: boolean; message?: string; transRef?: string; amount?: number } };

export async function POST(request: Request) {
  try {
    const user = await requireLineUser(request);
    if (!process.env.SLIPOK_API_KEY || !process.env.SLIPOK_BRANCH_ID) return Response.json({ error: 'ยังไม่ได้ตั้งค่าระบบตรวจสลิป' }, { status: 503 });
    const form = await request.formData();
    const bookingValue = form.get('bookingId');
    const bookingId = typeof bookingValue === 'string' ? bookingValue : '';
    const slip = form.get('slip');
    if (!(slip instanceof File) || !slip.type.startsWith('image/') || slip.size > 10 * 1024 * 1024) return Response.json({ error: 'กรุณาแนบรูปสลิปไม่เกิน 10 MB' }, { status: 400 });
    const booking = (await getBookings()).find((item) => item.id === bookingId && item.lineUserId === user.userId);
    if (!booking) return Response.json({ error: 'ไม่พบรายการจอง' }, { status: 404 });
    if (booking.status === 'confirmed') return Response.json({ error: 'รายการนี้ชำระเงินแล้ว' }, { status: 409 });
    const serviceRows = await getValues('Services!A2:E');
    const priceSatang = Number(serviceRows.find((row) => row[0] === booking.serviceId)?.[3] ?? 0);
    const amountSatang = Math.min(30000, priceSatang);
    const key = `slips/${booking.id}/${crypto.randomUUID()}-${slip.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const blob = await put(key, slip, { access: 'private', addRandomSuffix: false, contentType: slip.type });

    const slipForm = new FormData(); slipForm.set('files', slip); slipForm.set('log', 'true'); slipForm.set('amount', String(amountSatang / 100));
    const response = await fetch(`https://api.slipok.com/api/line/apikey/${process.env.SLIPOK_BRANCH_ID}`, { method: 'POST', headers: { 'x-authorization': process.env.SLIPOK_API_KEY }, body: slipForm });
    const result = await response.json() as SlipResult;
    if (!response.ok || !result.success || !result.data?.success) return Response.json({ error: result.data?.message ?? 'สลิปไม่ผ่านการตรวจสอบ' }, { status: 422 });
    const paymentRows = await getValues('Payments!A2:G');
    if (result.data.transRef && paymentRows.some((row) => row[4] === result.data?.transRef)) return Response.json({ error: 'สลิปนี้ถูกใช้แล้ว' }, { status: 409 });
    const paymentId = crypto.randomUUID();
    await appendValues('Payments', [paymentId, booking.id, amountSatang, blob.pathname, result.data.transRef ?? '', 'verified', new Date().toISOString()]);
    await updateCell('Bookings', booking.row, 'K', 'confirmed');
    await pushBookingConfirmation(user.userId, { id: booking.id, service: booking.serviceName, barber: booking.barberName, date: booking.date, time: booking.time });
    const target = await getBarberTarget(booking.barberId);
    if (target) await pushLineMessage(target, `ยืนยันชำระเงินแล้ว ✅\nลูกค้า: ${booking.customerName}\nโทร: ${booking.phone}\nบริการ: ${booking.serviceName}\nช่าง: ${booking.barberName}\nวันที่ ${booking.date} เวลา ${booking.time} น.\nเลขที่ ${booking.id}`).catch(console.error);
    return Response.json({ verified: true, bookingId: booking.id, transRef: result.data.transRef });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return Response.json({ error: 'ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
