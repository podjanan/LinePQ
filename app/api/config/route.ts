import { env } from 'cloudflare:workers';

export async function GET() {
  return Response.json({
    liffId: env.LIFF_ID ?? '',
    bankName: env.BANK_NAME ?? 'ธนาคารของร้าน',
    accountName: env.BANK_ACCOUNT_NAME ?? 'ชื่อบัญชีร้าน',
    accountNumber: env.BANK_ACCOUNT_NUMBER ?? 'กรุณาตั้งค่าเลขบัญชี',
    paymentQrUrl: env.PAYMENT_QR_URL ?? '',
    configured: Boolean(env.LIFF_ID && env.LINE_CHANNEL_ID && env.SLIPOK_API_KEY && env.SLIPOK_BRANCH_ID),
  });
}
