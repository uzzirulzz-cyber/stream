import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { recordDonation } from '@/lib/monetization-extras';

export const dynamic = 'force-dynamic';

// POST /api/donations — record a tip/donation
// Body: { amountCents: number, message?: string, method?: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const amountCents = Number(body.amountCents);
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'Minimum donation is $1.00' }, { status: 400 });
  }
  const user = await getCurrentUser();
  await recordDonation(user.id, amountCents, body.message, body.method || 'manual');
  return NextResponse.json({ ok: true, amountCents });
}
