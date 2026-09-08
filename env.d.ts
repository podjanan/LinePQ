declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    LIFF_ID?: string;
    LINE_CHANNEL_ID?: string;
    LINE_CHANNEL_SECRET?: string;
    LINE_CHANNEL_ACCESS_TOKEN?: string;
    SLIPOK_API_KEY?: string;
    SLIPOK_BRANCH_ID?: string;
    BANK_NAME?: string;
    BANK_ACCOUNT_NAME?: string;
    BANK_ACCOUNT_NUMBER?: string;
    PAYMENT_QR_URL?: string;
  }
}
