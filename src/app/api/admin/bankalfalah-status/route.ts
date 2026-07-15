import { NextResponse } from 'next/server';
import { isBankAlfalahConfigured, getBankAlfalahEnv } from '@/lib/bankalfalah';

export const dynamic = 'force-dynamic';

// GET /api/admin/bankalfalah-status — check if Bank Alfalah is configured
export async function GET() {
  const configured = isBankAlfalahConfigured();
  const env = getBankAlfalahEnv();

  return NextResponse.json({
    configured,
    environment: env,
    endpoint: env === 'production'
      ? 'https://payments.bankalfalah.com/HS/api/HSAPI/HSAPI'
      : 'https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI',
    message: configured
      ? 'Bank Alfalah is configured. VIP payments will use the hosted session flow.'
      : 'Bank Alfalah not configured. Add BANKALFALAH_MERCHANT_ID, BANKALFALAH_STORE_ID, BANKALFALAH_USERNAME, BANKALFALAH_PASSWORD to .env',
  });
}
