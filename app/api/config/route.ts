export async function GET() {
  return Response.json({
    liffId: process.env.LIFF_ID ?? '',
    bankName: process.env.BANK_NAME ?? 'ธนาคารของร้าน',
    accountName: process.env.BANK_ACCOUNT_NAME ?? 'ชื่อบัญชีร้าน',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? 'กรุณาตั้งค่าเลขบัญชี',
    paymentQrUrl: process.env.PAYMENT_QR_URL ?? '',
    configured: Boolean(process.env.LIFF_ID && process.env.LINE_CHANNEL_ID && process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.SLIPOK_API_KEY && process.env.SLIPOK_BRANCH_ID),
  });
}
