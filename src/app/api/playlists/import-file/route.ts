import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseM3U } from '@/lib/m3u';
import { categorizeChannel, channelSignature, detectCountry, detectLanguage } from '@/lib/categorize';
import { importPlaylist } from '@/lib/import-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const FEATURED_KW = [
  'sky sports', 'tnt sports', 'bt sport', 'espn', 'eurosport', 'bein', 'willow',
  't sports', 'tsports', 'sony sports', 'fox sports', 'dazn', 'wwe', 'ufc',
  'f1 tv', 'premier league', 'champions league', 'supersport', 'sportsnet', 'tsn',
];
const ADULT_KW = [
  'xxx', 'adult', 'porn', '18+', 'erotic', 'sex', 'nude', 'brazzers', 'playboy',
  'hustler', 'redlight', 'pink tv', 'babes', 'masturbat', 'orgasm', 'strip',
  'milf', 'hentai', 'dhc', 'venus', 'super one', 'superone', 'midnight',
  'private spice', 'xtsy', 'fresh!', 'flirt', 'jktv',
];

// POST /api/playlists/import-file — import an uploaded M3U file as a new playlist
// Accepts multipart/form-data with: name (string), file (M3U file)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = String(formData.get('name') || 'Custom Playlist').trim();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'M3U file is required' }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 50MB' }, { status: 400 });
  }

  const count = await db.playlist.count();
  if (count >= 5) {
    return NextResponse.json({ error: 'Maximum of 5 playlists allowed' }, { status: 400 });
  }

  // Read + parse the M3U file.
  const text = await file.text();
  if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
    return NextResponse.json({ error: 'File is not a valid M3U playlist' }, { status: 400 });
  }
  const parsed = parseM3U(text);

  // Create the playlist record (use a synthetic URL so it doesn't clash).
  const playlist = await db.playlist.create({
    data: {
      name,
      url: `file://custom/${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      status: 'refreshing',
      refreshHours: 0, // local files don't auto-refresh
    },
  });

  // Gather existing signatures from other playlists for dedup.
  const otherChannels = await db.channel.findMany({
    where: { sourceId: { not: playlist.id } },
    select: { signature: true },
  });
  const existingSigs = new Set(otherChannels.map((c) => c.signature));

  const seenInThis = new Set<string>();
  const toCreate = [];
  let duplicates = 0;
  let adultFiltered = 0;
  let errors = 0;

  for (const ch of parsed) {
    if (!ch.url || !ch.name) { errors++; continue; }

    // EXCLUDE adult content.
    const text2 = `${ch.name} ${ch.groupTitle ?? ''}`.toLowerCase();
    if (ADULT_KW.some((k) => text2.includes(k))) { adultFiltered++; continue; }

    const sig = channelSignature(ch.name, ch.url);
    if (existingSigs.has(sig) || seenInThis.has(sig)) { duplicates++; continue; }
    seenInThis.add(sig);

    const { category, subcategory } = categorizeChannel({
      name: ch.name, tvgName: ch.tvgName, groupTitle: ch.groupTitle,
    });

    const nameText = `${ch.name} ${ch.groupTitle ?? ''}`.toLowerCase();
    const featured = FEATURED_KW.some((k) => nameText.includes(k));

    toCreate.push({
      name: ch.name,
      displayName: ch.name,
      url: ch.url,
      logo: ch.logo ?? null,
      categoryMode: 'auto' as const,
      category,
      subcategory: subcategory ?? null,
      country: detectCountry(ch.groupTitle, ch.name),
      language: detectLanguage(ch.groupTitle, ch.name),
      tvgId: ch.tvgId ?? null,
      tvgName: ch.tvgName ?? null,
      groupTitle: ch.groupTitle ?? null,
      status: 'online' as const,
      featured,
      trending: featured,
      liveNow: true,
      signature: sig,
      sourceId: playlist.id,
    });
  }

  // Insert in batches to handle large files.
  const BATCH = 500;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    await db.channel.createMany({ data: toCreate.slice(i, i + BATCH) });
  }

  // Update playlist stats.
  await db.playlist.update({
    where: { id: playlist.id },
    data: {
      status: 'active',
      channelCount: toCreate.length,
      onlineCount: toCreate.length,
      offlineCount: 0,
      lastRefreshAt: new Date(),
      lastRefreshMs: 0,
      enabled: true,
    },
  });

  await db.importLog.create({
    data: {
      playlistId: playlist.id,
      status: 'success',
      imported: toCreate.length,
      duplicates,
      errors,
      message: `Imported ${toCreate.length} channels from file (${duplicates} dupes, ${adultFiltered} adult filtered)`,
    },
  });

  return NextResponse.json({
    ok: true,
    playlist: { id: playlist.id, name },
    imported: toCreate.length,
    duplicates,
    adultFiltered,
    errors,
  });
}
