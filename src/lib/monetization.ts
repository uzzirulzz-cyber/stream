// Monetization helpers: ad serving, revenue tracking, subscription seeding.

import { db } from './db';
import { getCurrentUser } from './user';
import type { AdSlot, AdSlotDTO, SubscriptionPlan, SubscriptionPlanDTO } from './types';

/** Ad placement keys used across the app. */
export const AD_PLACEMENTS = [
  'banner-home',
  'banner-category',
  'in-stream',
  'sidebar',
  'sponsored-rail',
  'interstitial',
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** Convert a Prisma AdSlot row into a DTO with derived CTR. */
export function toAdSlotDTO(slot: AdSlot): AdSlotDTO {
  const ctr = slot.impressions > 0 ? (slot.clicks / slot.impressions) * 100 : 0;
  return {
    id: slot.id,
    name: slot.name,
    placement: slot.placement,
    type: slot.type,
    imageUrl: slot.imageUrl,
    videoUrl: slot.videoUrl,
    targetUrl: slot.targetUrl,
    headline: slot.headline,
    description: slot.description,
    cta: slot.cta,
    cpmCents: slot.cpmCents,
    cpcCents: slot.cpcCents,
    enabled: slot.enabled,
    impressions: slot.impressions,
    clicks: slot.clicks,
    revenueCents: slot.revenueCents,
    ctr: Math.round(ctr * 100) / 100,
  };
}

/** Convert a SubscriptionPlan row into a DTO (features split into array). */
export function toPlanDTO(plan: SubscriptionPlan): SubscriptionPlanDTO {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    priceCents: plan.priceCents,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features ? plan.features.split('\n').filter(Boolean) : [],
    popular: plan.popular,
    enabled: plan.enabled,
    sortOrder: plan.sortOrder,
  };
}

/** Pick a random enabled ad for a placement (simple rotation). */
export async function serveAd(placement: string): Promise<AdSlotDTO | null> {
  // Fetch all enabled ads for the placement, then filter the time window in JS
  // to keep the query simple and Prisma-version-safe.
  const slots = await db.adSlot.findMany({
    where: { placement, enabled: true },
  });
  const now = Date.now();
  const valid = slots.filter(
    (s) => (!s.startAt || s.startAt.getTime() <= now) && (!s.endAt || s.endAt.getTime() > now),
  );
  if (valid.length === 0) return null;
  const picked = valid[Math.floor(Math.random() * valid.length)];
  return toAdSlotDTO(picked);
}

/**
 * Record an ad impression or click + compute revenue earned.
 * Revenue = CPM/1000 for impressions, CPC for clicks.
 */
export async function trackAdEvent(slotId: string, kind: 'impression' | 'click'): Promise<{ revenueCents: number }> {
  const slot = await db.adSlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.enabled) return { revenueCents: 0 };

  const revenueCents = kind === 'impression' ? Math.ceil(slot.cpmCents / 1000) : slot.cpcCents;

  const today = new Date().toISOString().slice(0, 10);
  const source = kind === 'impression' ? 'ad_impression' : 'ad_click';

  await db.$transaction([
    db.adImpression.create({
      data: { slotId, kind, revenueCents },
    }),
    db.adSlot.update({
      where: { id: slotId },
      data: {
        impressions: kind === 'impression' ? { increment: 1 } : slot.impressions,
        clicks: kind === 'click' ? { increment: 1 } : slot.clicks,
        revenueCents: { increment: revenueCents },
      },
    }),
    db.revenueDaily.upsert({
      where: { date_source: { date: today, source } },
      create: { id: `${today}_${source}`, date: today, source, amountCents: revenueCents, count: 1 },
      update: { amountCents: { increment: revenueCents }, count: { increment: 1 } },
    }),
  ]);

  return { revenueCents };
}

/** Record a page view → contributes to RPM calculation. */
export async function trackPageView(): Promise<void> {
  try {
    await getCurrentUser();
  } catch {
    // ignore — page view tracking is best-effort
  }
  const today = new Date().toISOString().slice(0, 10);
  const source = 'page_view';
  await db.revenueDaily.upsert({
    where: { date_source: { date: today, source } },
    create: { id: `${today}_${source}`, date: today, source, amountCents: 0, count: 1 },
    update: { count: { increment: 1 } },
  }).catch(() => {});
}

/** Record a subscription payment + revenue. */
export async function recordSubscriptionPayment(userId: string, planId: string, amountCents: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.$transaction([
    db.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    db.payment.create({
      data: {
        userId,
        type: 'subscription',
        amountCents,
        status: 'completed',
        method: 'card',
        reference: `sub_${Date.now()}`,
      },
    }),
    db.revenueDaily.upsert({
      where: { date_source: { date: today, source: 'subscription' } },
      create: { id: `${today}_subscription`, date: today, source: 'subscription', amountCents, count: 1 },
      update: { amountCents: { increment: amountCents }, count: { increment: 1 } },
    }),
  ]);
}

/** Seed default subscription plans if none exist. */
export async function seedMonetization(): Promise<void> {
  // Always ensure the Free plan exists and is up to date.
  // Remove any paid plans (all content is now free).
  const existing = await db.subscriptionPlan.findMany();
  for (const p of existing) {
    if (p.tier === 'free') {
      await db.subscriptionPlan.update({
        where: { id: p.id },
        data: {
          name: 'Free',
          priceCents: 0,
          interval: 'month',
          features: 'Watch ALL live channels\nFull HD 1080p quality\nNo subscription fee\nAll sports categories\nFavorites & watch history\nLive notifications\nUnlimited streaming',
          popular: true,
          enabled: true,
        },
      });
    } else {
      // Disable paid plans.
      await db.subscriptionPlan.update({
        where: { id: p.id },
        data: { enabled: false },
      });
    }
  }

  if (existing.length === 0) {
    await db.subscriptionPlan.create({
      data: {
        name: 'Free',
        tier: 'free',
        priceCents: 0,
        interval: 'month',
        features: 'Watch ALL live channels\nFull HD 1080p quality\nNo subscription fee\nAll sports categories\nFavorites & watch history\nLive notifications\nUnlimited streaming',
        popular: true,
        sortOrder: 0,
      },
    });
  }

  // Seed ad slots — add any missing placements.
  const ads = [
    {
      name: 'Home Leaderboard',
      placement: 'banner-home',
      type: 'image',
      imageUrl: null,
      targetUrl: 'https://example.com/sports-betting',
      headline: 'Bet on Your Favorite Teams',
      description: 'Get up to $500 in free bets. 18+. T&Cs apply.',
      cta: 'Claim Bonus',
      cpmCents: 250, // $0.25 CPM
      cpcCents: 75,  // $0.75 CPC
    },
    {
      name: 'Category Banner',
      placement: 'banner-category',
      type: 'image',
      imageUrl: null,
      targetUrl: 'https://example.com/sports-gear',
      headline: 'Official Sports Jerseys — 20% Off',
      description: 'Shop authentic kits from Premier League, La Liga, IPL & more.',
      cta: 'Shop Now',
      cpmCents: 200,
      cpcCents: 60,
    },
    {
      name: 'Sponsored Rail',
      placement: 'sponsored-rail',
      type: 'image',
      imageUrl: null,
      targetUrl: 'https://example.com/vpn',
      headline: 'Stream Without Buffering',
      description: 'Fast, secure VPN for sports streaming. 7-day free trial.',
      cta: 'Try Free',
      cpmCents: 300,
      cpcCents: 100,
    },
    {
      name: 'In-Stream Midroll',
      placement: 'in-stream',
      type: 'video',
      videoUrl: null,
      targetUrl: 'https://example.com/energy-drink',
      headline: 'Fuel Your Game',
      description: 'The official energy drink of champions.',
      cta: 'Learn More',
      cpmCents: 800,
      cpcCents: 0,
    },
    {
      name: 'Interstitial — Sportsbook',
      placement: 'interstitial',
      type: 'image',
      imageUrl: null,
      targetUrl: 'https://example.com/sportsbook',
      headline: '$500 Welcome Bonus',
      description: 'New players only. Bet on football, cricket, UFC & more. 18+.',
      cta: 'Claim Now',
      cpmCents: 500,
      cpcCents: 150,
    },
    {
      name: 'Sidebar Sticky',
      placement: 'sidebar',
      type: 'image',
      imageUrl: null,
      targetUrl: 'https://example.com/streaming-deal',
      headline: 'Get 50% Off Streaming Gear',
      description: 'Limited time offer on capture cards, mics & lighting.',
      cta: 'Shop Deal',
      cpmCents: 180,
      cpcCents: 50,
    },
  ];

  // Get existing placements so we only add missing ones.
  const existingPlacements = new Set((await db.adSlot.findMany({ select: { placement: true } })).map((s) => s.placement));
  for (const a of ads) {
    if (!existingPlacements.has(a.placement)) {
      await db.adSlot.create({ data: a });
    }
  }
}
