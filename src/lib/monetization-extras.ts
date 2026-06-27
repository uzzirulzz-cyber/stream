// Monetization expansion: affiliates, donations, sponsored placements,
// traffic tracking, and a revenue estimator.

import { db } from './db';
import { getCurrentUser } from './user';

export interface AffiliateLinkDTO {
  id: string;
  name: string;
  category: string;
  targetUrl: string;
  imageUrl: string | null;
  headline: string;
  description: string | null;
  cta: string;
  cpcCents: number;
  cpaCents: number;
  clicks: number;
  conversions: number;
  revenueCents: number;
}

export function toAffiliateDTO(a: {
  id: string; name: string; category: string; targetUrl: string;
  imageUrl: string | null; headline: string; description: string | null;
  cta: string; cpcCents: number; cpaCents: number;
  clicks: number; conversions: number; revenueCents: number;
}): AffiliateLinkDTO {
  return {
    id: a.id, name: a.name, category: a.category, targetUrl: a.targetUrl,
    imageUrl: a.imageUrl, headline: a.headline, description: a.description,
    cta: a.cta, cpcCents: a.cpcCents, cpaCents: a.cpaCents,
    clicks: a.clicks, conversions: a.conversions, revenueCents: a.revenueCents,
  };
}

/** Detect device type from a User-Agent string. */
export function detectDevice(ua: string | null): string {
  if (!ua) return 'desktop';
  const u = ua.toLowerCase();
  if (/smart-tv|googletv|aftt|bravia|tvos|appletv/.test(u)) return 'tv';
  if (/android tv/.test(u)) return 'tv';
  if (/ipad|tablet/.test(u)) return 'tablet';
  if (/mobile|iphone|android.*mobile|blackberry|opera mini/.test(u)) return 'mobile';
  return 'desktop';
}

/** Record a traffic event (page view, session, channel view, search). */
export async function trackTraffic(kind: string, path?: string, referrer?: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    await db.trafficEvent.create({
      data: {
        kind,
        path: path?.slice(0, 200) || null,
        userId: user.id,
        device: detectDevice(ua),
        referrer: referrer?.slice(0, 200) || null,
      },
    });
  } catch {
    // best-effort — never let traffic tracking break the page
  }
}

/** Record an affiliate click + accrue CPC commission. */
export async function trackAffiliateClick(linkId: string): Promise<{ revenueCents: number }> {
  const link = await db.affiliateLink.findUnique({ where: { id: linkId } });
  if (!link || !link.enabled) return { revenueCents: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const revenueCents = link.cpcCents;

  await db.$transaction([
    db.affiliateLink.update({
      where: { id: linkId },
      data: { clicks: { increment: 1 }, revenueCents: { increment: revenueCents } },
    }),
    db.revenueDaily.upsert({
      where: { date_source: { date: today, source: 'affiliate_click' } },
      create: { id: `${today}_affiliate_click`, date: today, source: 'affiliate_click', amountCents: revenueCents, count: 1 },
      update: { amountCents: { increment: revenueCents }, count: { increment: 1 } },
    }),
  ]);

  return { revenueCents };
}

/** Record a donation + revenue. */
export async function recordDonation(userId: string | null, amountCents: number, message?: string, method = 'manual'): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.$transaction([
    db.donation.create({
      data: { userId, amountCents, message, method, status: 'completed' },
    }),
    db.payment.create({
      data: { userId, type: 'donation', amountCents, status: 'completed', method },
    }),
    db.revenueDaily.upsert({
      where: { date_source: { date: today, source: 'donation' } },
      create: { id: `${today}_donation`, date: today, source: 'donation', amountCents, count: 1 },
      update: { amountCents: { increment: amountCents }, count: { increment: 1 } },
    }),
  ]);
}

/** Get active sponsored placements for a position. */
export async function getSponsoredPlacements(placement: string, limit = 5) {
  const now = new Date();
  const rows = await db.sponsoredPlacement.findMany({
    where: { placement, active: true },
    include: { channel: { include: { playlist: true } } },
    take: limit * 2,
  });
  // filter time window in JS
  const valid = rows.filter(
    (r) => (!r.startAt || r.startAt <= now) && (!r.endAt || r.endAt >= now) && r.channel,
  );
  return valid.slice(0, limit);
}

/**
 * Revenue estimator — projects expected monthly revenue based on traffic.
 * Uses industry-standard RPM ranges for sports streaming sites.
 */
export function estimateRevenue(monthlyPageViews: number) {
  // Industry RPM benchmarks for ad-supported streaming (USD per 1000 views):
  const adRpm = 3.50;        // display ads
  const videoRpm = 8.00;     // video pre-roll
  const affiliateRpm = 1.20; // affiliate clicks
  const donationRpm = 0.40;  // tip jar conversion
  const sponsoredRpm = 2.00; // sponsored placements

  const ad = Math.round((monthlyPageViews / 1000) * adRpm * 100);
  const video = Math.round((monthlyPageViews / 1000) * videoRpm * 100 * 0.4); // 40% watch video
  const affiliate = Math.round((monthlyPageViews / 1000) * affiliateRpm * 100);
  const donation = Math.round((monthlyPageViews / 1000) * donationRpm * 100);
  const sponsored = Math.round((monthlyPageViews / 1000) * sponsoredRpm * 100);

  return {
    ad, video, affiliate, donation, sponsored,
    total: ad + video + affiliate + donation + sponsored,
    monthly: monthlyPageViews,
    rpm: Math.round((ad + video + affiliate + donation + sponsored) / (monthlyPageViews / 1000)),
  };
}

/** Seed demo affiliate links + sponsored placements. */
export async function seedMonetizationExtras(): Promise<void> {
  const count = await db.affiliateLink.count();
  if (count === 0) {
    const affiliates = [
      { name: 'Bet365 Sports Bonus', category: 'betting', targetUrl: 'https://example.com/bet365', headline: 'Get $200 in Bet Credits', description: 'New customers only. 18+. T&Cs apply.', cta: 'Claim Bonus', cpcCents: 150, cpaCents: 5000, sortOrder: 1 },
      { name: 'Official Team Jerseys', category: 'merchandise', targetUrl: 'https://example.com/jerseys', headline: 'Authentic Sports Jerseys — 20% Off', description: 'Premier League, La Liga, IPL & more.', cta: 'Shop Now', cpcCents: 80, cpaCents: 3000, sortOrder: 2 },
      { name: 'Stream Without Buffering', category: 'vpn', targetUrl: 'https://example.com/vpn', headline: 'Fast VPN for Sports Streaming', description: '7-day free trial. Watch without geo-blocks.', cta: 'Try Free', cpcCents: 200, cpaCents: 4000, sortOrder: 3 },
      { name: 'Streaming Gear Store', category: 'streaming_gear', targetUrl: 'https://example.com/gear', headline: 'Pro Streaming Equipment', description: 'Capture cards, mics, lighting & more.', cta: 'Browse', cpcCents: 100, cpaCents: 2500, sortOrder: 4 },
      { name: 'Live Match Tickets', category: 'ticketing', targetUrl: 'https://example.com/tickets', headline: 'Buy Official Match Tickets', description: 'Premier League, Champions League, World Cup.', cta: 'Get Tickets', cpcCents: 120, cpaCents: 3500, sortOrder: 5 },
      { name: 'Fantasy League Signup', category: 'fantasy', targetUrl: 'https://example.com/fantasy', headline: 'Play Fantasy Football — Win Cash', description: 'Draft your team. Win real money prizes.', cta: 'Play Now', cpcCents: 180, cpaCents: 4500, sortOrder: 6 },
    ];
    for (const a of affiliates) {
      await db.affiliateLink.create({ data: a });
    }
  }

  // Seed a couple of sponsored placements using existing featured channels.
  const spCount = await db.sponsoredPlacement.count();
  if (spCount === 0) {
    const featured = await db.channel.findMany({
      where: { featured: true, enabled: true },
      take: 4,
      select: { id: true, displayName: true },
    });
    const placements = [
      { placement: 'home-rail', sponsor: 'Canal+ Sports' },
      { placement: 'category-top', sponsor: 'DAZN Network' },
      { placement: 'live-top', sponsor: 'ESPN+ Partner' },
      { placement: 'search-top', sponsor: 'beIN Sports' },
    ];
    for (let i = 0; i < Math.min(featured.length, placements.length); i++) {
      await db.sponsoredPlacement.create({
        data: {
          channelId: featured[i].id,
          placement: placements[i].placement,
          sponsor: placements[i].sponsor,
          paidCents: 5000 + i * 2000,
        },
      });
    }
  }
}
