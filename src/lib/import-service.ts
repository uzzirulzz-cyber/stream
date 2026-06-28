// Import service: fetches M3U playlists, parses, dedupes, categorizes and
// persists channels. This implements the "Import all playlists / Merge /
// Remove duplicates / Auto-refresh" requirements.

import { db } from './db';
import { fetchAndParseM3U } from './m3u';
import { categorizeChannel, channelSignature, detectCountry, detectLanguage } from './categorize';

// Well-known premium channel fragments → auto-flag as featured/trending/live.
const FEATURED_KW = [
  'sky sports', 'tnt sports', 'bt sport', 'espn', 'eurosport', 'euro sport',
  'bein', 'willow', 't sports', 'tsports', 'sony sports', 'fox sports',
  'dazn', 'wwe', 'ufc', 'f1 tv', 'premier league', 'champions league',
  'supersport', 'sportsnet', 'tsn', 'optus sport',
];
const TRENDING_KW = [
  'sky sports', 'espn', 'bein', 'wwe', 'ufc', 't sports', 'willow',
  'premier league', 'champions league', 'ipl', 'psl', 'f1', 'nba', 'nfl',
];

// Adult content keywords — channels matching these are EXCLUDED from import.
const ADULT_KW = [
  'xxx', 'adult', 'porn', '18+', '18 +', 'erotic', 'sex', 'nude', 'brazzers',
  'playboy', 'hustler', 'redlight', 'pink tv', 'babes', 'masturbat', 'orgasm',
  'strip', 'milf', 'hentai', 'dhc', 'venus', 'super one', 'superone',
  'midnight', 'private spice', 'xtsy', 'fresh!', 'flirt', 'jktv',
];

function matchesAny(text: string, kws: string[]): boolean {
  const t = text.toLowerCase();
  return kws.some((k) => t.includes(k));
}

/** Returns true if a channel name/group should be EXCLUDED (adult content). */
function isAdultContent(name: string, groupTitle?: string): boolean {
  const text = `${name} ${groupTitle ?? ''}`.toLowerCase();
  return ADULT_KW.some((k) => text.includes(k));
}

export interface ImportResult {
  playlistId: string;
  imported: number;
  duplicates: number;
  errors: number;
  durationMs: number;
  message?: string;
}

/**
 * Import (or refresh) a single playlist. Deletes existing channels for the
 * playlist, fetches the M3U, dedupes against channels from OTHER playlists,
 * categorizes, and inserts.
 */
export async function importPlaylist(playlistId: string): Promise<ImportResult> {
  const start = Date.now();
  const playlist = await db.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) throw new Error('Playlist not found');

  await db.playlist.update({
    where: { id: playlistId },
    data: { status: 'refreshing', errorMessage: null },
  });

  try {
    const parsed = await fetchAndParseM3U(playlist.url);

    // Gather signatures already present in OTHER playlists so we can dedupe.
    const otherChannels = await db.channel.findMany({
      where: { sourceId: { not: playlistId } },
      select: { signature: true },
    });
    const existingSigs = new Set(otherChannels.map((c) => c.signature));

    // Dedupe within this playlist too.
    const seenInThis = new Set<string>();
    const toCreate = [];
    let duplicates = 0;
    let errors = 0;
    let adultFiltered = 0;

    for (const ch of parsed) {
      if (!ch.url || !ch.name) {
        errors++;
        continue;
      }
      // EXCLUDE adult content — never imported.
      if (isAdultContent(ch.name, ch.groupTitle)) {
        adultFiltered++;
        continue;
      }
      const sig = channelSignature(ch.name, ch.url);
      if (existingSigs.has(sig) || seenInThis.has(sig)) {
        duplicates++;
        continue;
      }
      seenInThis.add(sig);

      const { category, subcategory } = categorizeChannel({
        name: ch.name,
        tvgName: ch.tvgName,
        groupTitle: ch.groupTitle,
      });

      const nameText = `${ch.name} ${ch.groupTitle ?? ''}`;
      const featured = matchesAny(nameText, FEATURED_KW);
      const trending = featured || matchesAny(nameText, TRENDING_KW);
      // ALL channels are marked as live + online so the /live page shows everything.
      const liveNow = true;

      toCreate.push({
        name: ch.name,
        displayName: ch.name,
        url: ch.url,
        logo: ch.logo ?? null,
        categoryMode: 'auto',
        category,
        subcategory: subcategory ?? null,
        country: detectCountry(ch.groupTitle, ch.name),
        language: detectLanguage(ch.groupTitle, ch.name),
        tvgId: ch.tvgId ?? null,
        tvgName: ch.tvgName ?? null,
        groupTitle: ch.groupTitle ?? null,
        status: 'online',
        featured,
        trending,
        liveNow,
        signature: sig,
        sourceId: playlistId,
      });
    }

    // Replace this playlist's channels in a transaction.
    await db.$transaction([
      db.channel.deleteMany({ where: { sourceId: playlistId } }),
      db.channel.createMany({ data: toCreate }),
      db.playlist.update({
        where: { id: playlistId },
        data: {
          status: 'active',
          channelCount: toCreate.length,
          onlineCount: toCreate.length,
          offlineCount: 0,
          lastRefreshAt: new Date(),
          lastRefreshMs: Date.now() - start,
          nextRefreshAt: new Date(Date.now() + playlist.refreshHours * 60 * 60 * 1000),
          errorMessage: null,
        },
      }),
      db.importLog.create({
        data: {
          playlistId,
          status: 'success',
          imported: toCreate.length,
          duplicates,
          errors,
          message: `Imported ${toCreate.length} channels (${duplicates} dupes, ${adultFiltered} adult filtered)`,
        },
      }),
    ]);

    return {
      playlistId,
      imported: toCreate.length,
      duplicates,
      errors,
      durationMs: Date.now() - start,
      message: `Imported ${toCreate.length} channels`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.playlist.update({
      where: { id: playlistId },
      data: { status: 'error', errorMessage: message },
    });
    await db.importLog.create({
      data: {
        playlistId,
        status: 'error',
        imported: 0,
        duplicates: 0,
        errors: 1,
        message,
      },
    });
    return {
      playlistId,
      imported: 0,
      duplicates: 0,
      errors: 1,
      durationMs: Date.now() - start,
      message,
    };
  }
}

/**
 * Quick health probe for a channel URL. HEAD request with short timeout.
 * Returns 'online' | 'offline'. Best-effort — many IPTV streams don't
 * support HEAD, so we fall back to a GET with a tiny range.
 */
export async function probeStream(url: string): Promise<'online' | 'offline'> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (res.status === 200 || res.status === 206 || res.status === 302 || res.status === 301) {
      return 'online';
    }
    return 'offline';
  } catch {
    return 'offline';
  }
}
