import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/purchase — buy PPV access to an event
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const event = await db.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!event.isPPV) return NextResponse.json({ ok: true, message: 'Free event — no purchase needed' });

  // Check if already purchased
  const existing = await db.eventPurchase.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: id } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, message: 'Already purchased', hasAccess: true });
  }

  // Create purchase record + record revenue
  const today = new Date().toISOString().slice(0, 10);
  await db.$transaction([
    db.eventPurchase.create({
      data: { userId: user.id, eventId: id, priceCents: event.ppvPriceCents },
    }),
    db.payment.create({
      data: { userId: user.id, type: 'one_time', amountCents: event.ppvPriceCents, status: 'completed', method: 'card', reference: `ppv_${id}` },
    }),
    db.revenueDaily.upsert({
      where: { date_source: { date: today, source: 'ppv' } },
      create: { id: `${today}_ppv`, date: today, source: 'ppv', amountCents: event.ppvPriceCents, count: 1 },
      update: { amountCents: { increment: event.ppvPriceCents }, count: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ ok: true, hasAccess: true, priceCents: event.ppvPriceCents });
}
