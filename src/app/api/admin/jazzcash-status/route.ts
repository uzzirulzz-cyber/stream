import { NextResponse } from 'next/server';
import { isJazzCashConfigured, getJazzCashEnv } from '@/lib/jazzcash';

export const dynamic = 'force-dynamic';

// GET /api/admin/jazzcash-status — check if JazzCash is configured
export async function GET() {
  const configured = isJazzCashConfigured();
  const env = getJazzCashEnv();

  return NextResponse.json({
    configured,
    environment: env,
    endpoint: env === 'production'
      ? 'https://jazzcash.com.pk/CentralBankPayment/RestGateway/PaymentAPI'
      : 'https://sandbox.jazzcash.com.pk/CentralBankPayment/RestGateway/PaymentAPI',
    message: configured
      ? 'JazzCash is configured. VIP payments will use the hosted payment page.'
      : 'JazzCash not configured. Add JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL to .env',
  });
}
