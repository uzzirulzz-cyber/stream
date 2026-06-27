import { NextRequest, NextResponse } from 'next/server';
import { getSponsoredPlacements } from '@/lib/monetization-extras';
import { toChannelDTO } from '@/lib/dto';
import { getCurrentUser } from '@/lib/user';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sponsored?placement=home-rail — get sponsored channel placements
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placement = searchParams.get('placement') || 'home-rail';
  const limit = Math.min(Number(searchParams.get('limit')) || 5, 10);

  const rows = await getSponsoredPlacements(placement, limit);
  if (rows.length === 0) return NextResponse.json({ placements: [] });

  const user = await getCurrentUser();
  const [favRows, subRows] = await Promise.all([
    db.favorite.findMany({ where: { userId: user.id }, select: { channelId: true } }),
    db.channelSubscription.findMany({ where: { userId: user.id }, select: { channelId: true } }),
  ]);
  const favIds = new Set(favRows.map((f) => f.channelId));
  const subIds = new Set(subRows.map((s) => s.channelId));

  return NextResponse.json({
    placements: rows.map((r) => ({
      sponsor: r.sponsor,
      paidCents: r.paidCents,
      channel: toChannelDTO(r.channel, favIds.has(r.channel.id), subIds.has(r.channel.id)),
    })),
  });
}
