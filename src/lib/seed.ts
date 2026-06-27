// Seed the database with the sports category hierarchy and a set of demo
// public IPTV playlists so the platform has content on first run.

import { db } from './db';
import { CATEGORY_TREE } from './categories';
import { seedMonetization } from './monetization';
import { seedMonetizationExtras } from './monetization-extras';

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

  // 4. Seed affiliate links + sponsored placements.
  await seedMonetizationExtras();
}
