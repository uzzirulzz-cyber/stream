import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/events/seed — seed upcoming events with PPV pricing
export async function POST() {
  const count = await db.event.count();
  if (count > 0) return NextResponse.json({ ok: true, message: 'Events already seeded' });

  const now = new Date();
  const events = [
    // Football
    { title: 'Manchester City vs Arsenal', description: 'Premier League Matchday 12 — title decider', category: 'Football', league: 'Premier League', eventDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), eventTime: '22:30 GMT', venue: 'Etihad Stadium', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'Real Madrid vs Barcelona', description: 'El Clásico — La Liga', category: 'Football', league: 'La Liga', eventDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), eventTime: '20:00 GMT', venue: 'Santiago Bernabéu', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'Bayern Munich vs Dortmund', description: 'Der Klassiker — Bundesliga', category: 'Football', league: 'Bundesliga', eventDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), eventTime: '17:30 GMT', venue: 'Allianz Arena', ppvPriceCents: 0, isPPV: false },
    { title: 'Champions League Final', description: 'UEFA Champions League Final 2026', category: 'Football', league: 'UEFA Champions League', eventDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), eventTime: '20:00 GMT', venue: 'Wembley Stadium', ppvPriceCents: 1999, isPPV: true, featured: true },

    // Cricket
    { title: 'India vs Pakistan — T20 World Cup', description: 'The biggest rivalry in cricket', category: 'Cricket', league: 'ICC T20 World Cup', eventDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), eventTime: '13:00 GMT', venue: 'Melbourne Cricket Ground', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'Mumbai Indians vs Chennai Super Kings', description: 'IPL 2026 — Eliminator', category: 'Cricket', league: 'IPL', eventDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), eventTime: '14:30 GMT', venue: 'Wankhede Stadium', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'Pakistan vs Australia — 1st ODI', description: 'Pakistan tour of Australia', category: 'Cricket', league: 'ODI Series', eventDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), eventTime: '04:00 GMT', venue: 'Sydney Cricket Ground', ppvPriceCents: 0, isPPV: false },
    { title: 'PSL 2026 Final', description: 'Pakistan Super League Grand Final', category: 'Cricket', league: 'PSL', eventDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), eventTime: '19:00 GMT', venue: 'Gaddafi Stadium, Lahore', ppvPriceCents: 999, isPPV: true, featured: true },

    // Wrestling
    { title: 'WWE RAW — Netflix Premiere', description: 'Monday Night RAW live on Netflix', category: 'Wrestling', league: 'WWE RAW', eventDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), eventTime: '20:00 GMT', venue: 'Intuit Dome', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'WrestleMania 42 — Night 1', description: 'The Grandest Stage of Them All', category: 'Wrestling', league: 'WWE', eventDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), eventTime: '23:00 GMT', venue: 'MetLife Stadium', ppvPriceCents: 2999, isPPV: true, featured: true },
    { title: 'UFC 312: Main Card', description: 'UFC Championship fights', category: 'Wrestling', league: 'UFC', eventDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), eventTime: '22:00 GMT', venue: 'T-Mobile Arena', ppvPriceCents: 2499, isPPV: true, featured: true },

    // Movies
    { title: 'Premiere: Avatar 3', description: 'World premiere streaming event', category: 'Movies', league: 'Hollywood', eventDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), eventTime: '18:00 GMT', venue: 'Streaming Worldwide', ppvPriceCents: 1499, isPPV: true, featured: true },
    { title: 'Bollywood Blockbuster Night', description: 'Latest Hindi movie premiere', category: 'Movies', league: 'Bollywood', eventDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), eventTime: '20:00 GMT', venue: 'Streaming', ppvPriceCents: 0, isPPV: false },

    // Web Series
    { title: 'Stranger Things S5 — Premiere', description: 'Final season premiere event', category: 'Web Series', league: 'Netflix', eventDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), eventTime: '15:00 GMT', venue: 'Netflix', ppvPriceCents: 0, isPPV: false, featured: true },
    { title: 'House of the Dragon S3 E1', description: 'New season premiere', category: 'Web Series', league: 'HBO', eventDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), eventTime: '21:00 GMT', venue: 'HBO Max', ppvPriceCents: 0, isPPV: false },

    // Music
    { title: 'Live Concert: Coldplay', description: 'Music of the Spheres World Tour', category: 'Music', league: 'Live Concert', eventDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000), eventTime: '19:30 GMT', venue: 'Wembley Stadium', ppvPriceCents: 1999, isPPV: true, featured: true },
  ];

  for (const e of events) {
    await db.event.create({ data: e });
  }

  return NextResponse.json({ ok: true, seeded: events.length });
}
