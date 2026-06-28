import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';

export const dynamic = 'force-dynamic';

// GET /api/events — list upcoming events (optionally filter by category)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'upcoming';

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (status === 'upcoming') {
    where.eventDate = { gte: new Date() };
    where.status = 'upcoming';
  } else if (status === 'all') {
    // no filter
  } else {
    where.status = status;
  }

  const events = await db.event.findMany({
    where,
    orderBy: { eventDate: 'asc' },
    take: 50,
  });

  // Check if user has purchased PPV access
  const user = await getCurrentUser();
  const purchases = await db.eventPurchase.findMany({
    where: { userId: user.id, eventId: { in: events.map((e) => e.id) } },
    select: { eventId: true },
  });
  const purchasedIds = new Set(purchases.map((p) => p.eventId));

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      league: e.league,
      eventDate: e.eventDate.toISOString(),
      eventTime: e.eventTime,
      venue: e.venue,
      imageUrl: e.imageUrl,
      streamUrl: e.streamUrl,
      ppvPriceCents: e.ppvPriceCents,
      isPPV: e.isPPV,
      status: e.status,
      featured: e.featured,
      hasAccess: !e.isPPV || purchasedIds.has(e.id),
    })),
  });
}

// POST /api/events — create event (admin)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const event = await db.event.create({
    data: {
      title,
      description: body.description || null,
      category: body.category || 'Other',
      league: body.league || null,
      eventDate: new Date(body.eventDate),
      eventTime: String(body.eventTime || ''),
      venue: body.venue || null,
      imageUrl: body.imageUrl || null,
      streamUrl: body.streamUrl || null,
      ppvPriceCents: Number(body.ppvPriceCents) || 0,
      isPPV: !!body.isPPV,
      featured: !!body.featured,
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
