import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toAffiliateDTO } from '@/lib/monetization-extras';

export const dynamic = 'force-dynamic';

// GET /api/affiliates — list affiliate links (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const where: Record<string, unknown> = { enabled: true };
  if (category) where.category = category;
  const links = await db.affiliateLink.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ affiliates: links.map(toAffiliateDTO) });
}
