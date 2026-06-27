import { NextRequest, NextResponse } from 'next/server';
import { trackAffiliateClick } from '@/lib/monetization-extras';

export const dynamic = 'force-dynamic';

// POST /api/affiliates/[id]/click — record a click + accrue CPC commission
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { revenueCents } = await trackAffiliateClick(id);
  return NextResponse.json({ ok: true, revenueCents });
}
