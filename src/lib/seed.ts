// Seed the database with the sports category hierarchy and a set of demo
// public IPTV playlists so the platform has content on first run.

import { db } from './db';
import { CATEGORY_TREE } from './categories';
import { seedMonetization } from './monetization';
import { seedMonetizationExtras } from './monetization-extras';
import { hashPassword } from './auth';

const DEMO_PLAYLISTS = [
  {
    name: 'IPTV-org Main',
    url: 'https://iptv-org.github.io/iptv/index.m3u',
  },
  {
    name: 'IPTV-org Sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
  },
  {
    name: 'Free-TV Movies & Sports',
    url: 'https://iptv-org.github.io/iptv/countries/us.m3u',
  },
];

export async function ensureSeeded(): Promise<void> {
  // 1. Seed categories if none exist.
  const catCount = await db.sportsCategory.count();
  if (catCount === 0) {
    const nodes = [];
    for (let i = 0; i < CATEGORY_TREE.length; i++) {
      const cat = CATEGORY_TREE[i];
      nodes.push({
        name: cat.name,
        slug: cat.slug,
        parentId: null,
        icon: cat.icon,
        color: cat.color,
        keywords: cat.fallbackKeywords.join(','),
        isCustom: false,
        sortOrder: i,
      });
      for (let j = 0; j < cat.subcategories.length; j++) {
        const sub = cat.subcategories[j];
        nodes.push({
          name: sub.name,
          slug: `${cat.slug}__${sub.slug}`,
          parentId: cat.slug, // temporary, fixed below
          icon: cat.icon,
          color: cat.color,
          keywords: sub.keywords.join(','),
          isCustom: false,
          sortOrder: j,
        });
      }
    }
    // Insert top-level first to get their real ids.
    for (const node of nodes.filter((n) => n.parentId === null)) {
      await db.sportsCategory.create({ data: node });
    }
    // Map slug -> id for top-level.
    const tops = await db.sportsCategory.findMany({ where: { parentId: null } });
    const slugToId = new Map(tops.map((t) => [t.slug, t.id]));
    for (const node of nodes.filter((n) => n.parentId !== null)) {
      const parentId = slugToId.get(node.parentId!);
      await db.sportsCategory.create({
        data: { ...node, parentId: parentId ?? null },
      });
    }
  }

  // 2. Seed default playlists if none exist.
  const plCount = await db.playlist.count();
  if (plCount === 0) {
    for (const p of DEMO_PLAYLISTS) {
      await db.playlist.create({
        data: {
          name: p.name,
          url: p.url,
          status: 'active',
          refreshHours: 6,
        },
      });
    }
  }

  // 3. Seed monetization (subscription plans + demo ad slots).
  await seedMonetization();

  // 4. Seed upcoming events (football, cricket, wrestling, movies, PPV).
  const eventCount = await db.event.count();
  if (eventCount === 0) {
    const now = new Date();
    const events = [
      { title: 'Manchester City vs Arsenal', description: 'Premier League title decider', category: 'Football', league: 'Premier League', eventDate: new Date(now.getTime() + 2*86400000), eventTime: '22:30 GMT', venue: 'Etihad Stadium', featured: true },
      { title: 'Real Madrid vs Barcelona', description: 'El Clásico', category: 'Football', league: 'La Liga', eventDate: new Date(now.getTime() + 5*86400000), eventTime: '20:00 GMT', venue: 'Bernabéu', featured: true },
      { title: 'India vs Pakistan T20', description: 'Biggest rivalry in cricket', category: 'Cricket', league: 'T20 World Cup', eventDate: new Date(now.getTime() + 3*86400000), eventTime: '13:00 GMT', venue: 'MCG', featured: true },
      { title: 'MI vs CSK — IPL Eliminator', description: 'IPL 2026 playoff', category: 'Cricket', league: 'IPL', eventDate: new Date(now.getTime() + 4*86400000), eventTime: '14:30 GMT', venue: 'Wankhede', featured: true },
      { title: 'WWE RAW — Netflix Premiere', description: 'Monday Night RAW live', category: 'Wrestling', league: 'WWE RAW', eventDate: new Date(now.getTime() + 1*86400000), eventTime: '20:00 GMT', venue: 'Intuit Dome', featured: true },
      { title: 'WrestleMania 42 — Night 1', description: 'The Grandest Stage', category: 'Wrestling', league: 'WWE', eventDate: new Date(now.getTime() + 21*86400000), eventTime: '23:00 GMT', venue: 'MetLife', ppvPriceCents: 2999, isPPV: true, featured: true },
      { title: 'UFC 312: Main Card', description: 'Championship fights', category: 'Wrestling', league: 'UFC', eventDate: new Date(now.getTime() + 8*86400000), eventTime: '22:00 GMT', venue: 'T-Mobile Arena', ppvPriceCents: 2499, isPPV: true, featured: true },
      { title: 'Champions League Final', description: 'UEFA CL Final 2026', category: 'Football', league: 'UCL', eventDate: new Date(now.getTime() + 30*86400000), eventTime: '20:00 GMT', venue: 'Wembley', ppvPriceCents: 1999, isPPV: true, featured: true },
      { title: 'Premiere: Avatar 3', description: 'World premiere streaming', category: 'Movies', league: 'Hollywood', eventDate: new Date(now.getTime() + 10*86400000), eventTime: '18:00 GMT', venue: 'Streaming', ppvPriceCents: 1499, isPPV: true, featured: true },
      { title: 'Stranger Things S5 Premiere', description: 'Final season', category: 'Web Series', league: 'Netflix', eventDate: new Date(now.getTime() + 12*86400000), eventTime: '15:00 GMT', venue: 'Netflix', featured: true },
      { title: 'Live Concert: Coldplay', description: 'Music of the Spheres Tour', category: 'Music', league: 'Live', eventDate: new Date(now.getTime() + 11*86400000), eventTime: '19:30 GMT', venue: 'Wembley', ppvPriceCents: 1999, isPPV: true, featured: true },
      { title: 'PSL 2026 Final', description: 'Pakistan Super League', category: 'Cricket', league: 'PSL', eventDate: new Date(now.getTime() + 14*86400000), eventTime: '19:00 GMT', venue: 'Gaddafi Stadium', ppvPriceCents: 999, isPPV: true, featured: true },
    ];
    for (const e of events) {
      await db.event.create({ data: { ...e, ppvPriceCents: e.ppvPriceCents || 0, isPPV: e.isPPV || false } });
    }
  }

  // 5. Seed affiliate links + sponsored placements.
  await seedMonetizationExtras();

  // 5. Seed hidden admin accounts (founder / ceo / director).
  // Password is the same for all three; details are never exposed in the UI.
  const ADMINS = [
    { email: 'founder@playbeat.live', name: 'Founder', role: 'super_admin' },
    { email: 'ceo@playbeat.live', name: 'CEO', role: 'admin' },
    { email: 'director@playbeat.live', name: 'Director', role: 'moderator' },
  ];
  const adminPass = hashPassword('playbeat123');
  for (const a of ADMINS) {
    const existing = await db.user.findUnique({ where: { email: a.email } });
    if (!existing) {
      await db.user.create({
        data: {
          cookie: `admin_${a.email}`,
          email: a.email,
          name: a.name,
          password: adminPass,
          role: a.role,
        },
      });
    } else if (!existing.password || existing.role !== a.role) {
      await db.user.update({
        where: { id: existing.id },
        data: { password: adminPass, role: a.role, name: a.name },
      });
    }
  }
}
