import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { estimateRevenue } from '@/lib/monetization-extras';

export const dynamic = 'force-dynamic';

// GET /api/revenue/estimate — traffic-based revenue projection
// Uses actual traffic events from last 30 days, projects monthly revenue.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customViews = searchParams.get('views');

  let monthlyViews: number;
  let basedOnActual = true;

  if (customViews) {
    monthlyViews = Number(customViews);
    basedOnActual = false;
  } else {
    // Count actual page views in last 30 days, extrapolate to monthly.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const count = await db.trafficEvent.count({
      where: { kind: 'page_view', createdAt: { gte: thirtyDaysAgo } },
    });
    monthlyViews = count;
  }

  const estimate = estimateRevenue(monthlyViews);

  // Also return actual revenue split
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const daily = await db.revenueDaily.findMany({
    where: { date: { gte: monthStartStr } },
  });

  const actualBySource: Record<string, number> = {};
  for (const d of daily) {
    actualBySource[d.source] = (actualBySource[d.source] ?? 0) + d.amountCents;
  }

  return NextResponse.json({
    estimate,
    basedOnActual,
    actual: {
      monthlyViews,
      adRevenueCents: (actualBySource['ad_impression'] ?? 0) + (actualBySource['ad_click'] ?? 0),
      affiliateRevenueCents: actualBySource['affiliate_click'] ?? 0,
      donationRevenueCents: actualBySource['donation'] ?? 0,
      subscriptionRevenueCents: actualBySource['subscription'] ?? 0,
      totalCents: Object.values(actualBySource).reduce((a, b) => a + b, 0),
    },
  });
}
