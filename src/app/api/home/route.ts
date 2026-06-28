import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toChannelDTO } from '@/lib/dto';
import { getCurrentUser } from '@/lib/user';

export const dynamic = 'force-dynamic';

// GET /api/home — aggregated homepage data (hero, live, featured, trending,
// recently added, favorites, continue watching, upcoming).
export async function GET() {
  const user = await getCurrentUser();

  const favRows = await db.favorite.findMany({
    where: { userId: user.id },
    include: { channel: { include: { playlist: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const favIds = new Set(favRows.map((f) => f.channelId));
  const subRows = await db.channelSubscription.findMany({
    where: { userId: user.id },
    select: { channelId: true },
  });
  const subIds = new Set(subRows.map((s) => s.channelId));

  const [
    liveNow,
    featuredFootball,
    featuredCricket,
    featuredWrestling,
    trending,
    recentlyAdded,
    continueWatching,
    favorites,
    historyRows,
  ] = await Promise.all([
    db.channel.findMany({
      where: { enabled: true, liveNow: true },
      include: { playlist: true },
      take: 12,
      orderBy: { viewCount: 'desc' },
    }),
    db.channel.findMany({
      where: { enabled: true, category: 'Football', featured: true },
      include: { playlist: true },
      take: 12,
      orderBy: { viewCount: 'desc' },
    }),
    db.channel.findMany({
      where: { enabled: true, category: 'Cricket', featured: true },
      include: { playlist: true },
      take: 12,
      orderBy: { viewCount: 'desc' },
    }),
    db.channel.findMany({
      where: { enabled: true, category: 'Wrestling', featured: true },
      include: { playlist: true },
      take: 12,
      orderBy: { viewCount: 'desc' },
    }),
    db.channel.findMany({
      where: { enabled: true, trending: true },
      include: { playlist: true },
      take: 14,
      orderBy: { viewCount: 'desc' },
    }),
    db.channel.findMany({
      where: { enabled: true },
      include: { playlist: true },
      orderBy: { createdAt: 'desc' },
      take: 14,
    }),
    db.continueWatching.findMany({
      where: { userId: user.id },
      include: { channel: { include: { playlist: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    Promise.resolve(favRows.map((f) => f.channel)),
    // User's recent history — used to build the "Recommended" rail.
    db.watchHistory.findMany({
      where: { userId: user.id },
      include: { channel: { include: { playlist: true } } },
      orderBy: { watchedAt: 'desc' },
      take: 30,
      distinct: ['channelId'],
    }),
  ]);

  const mapFav = (c: (typeof liveNow)[number]) => toChannelDTO(c, favIds.has(c.id), subIds.has(c.id));

  // Recommended streams: based on the categories the user has watched most.
  // If the user has no history yet, fall back to trending non-featured channels.
  const watchedCats = historyRows
    .filter((h) => h.channel)
    .map((h) => h.channel.category);
  const catCounts: Record<string, number> = {};
  for (const c of watchedCats) catCounts[c] = (catCounts[c] ?? 0) + 1;
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);

  const recommended = await db.channel.findMany({
    where: {
      enabled: true,
      ...(topCats.length ? { category: { in: topCats } } : { trending: true }),
    },
    include: { playlist: true },
    take: 14,
    orderBy: { viewCount: 'desc' },
  });

  // Category-based rails for the home page: Music, Sports (multi), Movies, Web Series.
  const [musicChannels, sportsChannels, movieChannels, webSeriesChannels, workingChannels] = await Promise.all([
    db.channel.findMany({ where: { enabled: true, category: 'Music' }, include: { playlist: true }, take: 14, orderBy: { viewCount: 'desc' } }),
    db.channel.findMany({ where: { enabled: true, category: 'Other Sports' }, include: { playlist: true }, take: 14, orderBy: { viewCount: 'desc' } }),
    db.channel.findMany({ where: { enabled: true, category: 'Movies' }, include: { playlist: true }, take: 14, orderBy: { viewCount: 'desc' } }),
    db.channel.findMany({ where: { enabled: true, category: 'Web Series' }, include: { playlist: true }, take: 14, orderBy: { viewCount: 'desc' } }),
    // Working channels (status = online, verified by probe)
    db.channel.findMany({ where: { enabled: true, status: 'online', featured: true }, include: { playlist: true }, take: 14, orderBy: { viewCount: 'desc' } }),
  ]);

  // Hero: pick the most-viewed trending channel, fallback to live now, fallback to first featured.
  const heroPool = [...(liveNow.length ? liveNow : []), ...trending, ...featuredFootball, ...featuredCricket];
  const hero = heroPool[0] ?? null;

  // Upcoming events (static demo — could be wired to an EPG later).
  const upcoming = [
    { title: 'Manchester City vs Arsenal', league: 'Premier League', time: 'Today 22:30', category: 'Football' },
    { title: 'Mumbai Indians vs Chennai Super Kings', league: 'IPL 2026', time: 'Tomorrow 19:00', category: 'Cricket' },
    { title: 'WWE RAW Live', league: 'WWE RAW', time: 'Mon 20:00', category: 'Wrestling' },
    { title: 'UFC 312: Main Card', league: 'UFC', time: 'Sat 23:00', category: 'Wrestling' },
    { title: 'Real Madrid vs Barcelona', league: 'La Liga', time: 'Sun 01:00', category: 'Football' },
    { title: 'Pakistan vs Australia — 1st ODI', league: 'ODI', time: 'Thu 15:00', category: 'Cricket' },
  ];

  return NextResponse.json({
    hero: hero ? mapFav(hero) : null,
    liveNow: liveNow.map(mapFav),
    featuredFootball: featuredFootball.map(mapFav),
    featuredCricket: featuredCricket.map(mapFav),
    featuredWrestling: featuredWrestling.map(mapFav),
    trending: trending.map(mapFav),
    recentlyAdded: recentlyAdded.map(mapFav),
    musicChannels: musicChannels.map(mapFav),
    sportsChannels: sportsChannels.map(mapFav),
    movieChannels: movieChannels.map(mapFav),
    webSeriesChannels: webSeriesChannels.map(mapFav),
    workingChannels: workingChannels.map(mapFav),
    continueWatching: continueWatching
      .filter((c) => c.channel)
      .map((c) => ({
        ...toChannelDTO(c.channel, true),
        position: c.position,
        updatedAt: c.updatedAt.toISOString(),
      })),
    favorites: favorites.map(mapFav),
    recommended: recommended.map(mapFav),
    recommendedBased: topCats,
    upcoming,
  });
}
