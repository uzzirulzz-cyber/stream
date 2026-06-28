import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toPlaylistDTO } from '@/lib/dto';
import { importPlaylist } from '@/lib/import-service';

export const dynamic = 'force-dynamic';

// GET /api/playlists — list all playlists
export async function GET() {
  const playlists = await db.playlist.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ playlists: playlists.map(toPlaylistDTO) });
}

// POST /api/playlists — create a playlist (max 3 per the spec)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const url = String(body.url ?? '').trim();

  if (!name || !url) {
    return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'url must start with http(s)://' }, { status: 400 });
  }

  const count = await db.playlist.count();
  if (count >= 5) {
    return NextResponse.json({ error: 'Maximum of 5 playlists allowed' }, { status: 400 });
  }

  const existing = await db.playlist.findUnique({ where: { url } });
  if (existing) {
    return NextResponse.json({ error: 'A playlist with this URL already exists' }, { status: 400 });
  }

  const playlist = await db.playlist.create({
    data: {
      name,
      url,
      status: 'active',
      refreshHours: Number(body.refreshHours) || 6,
    },
  });

  // Optionally trigger an import right away.
  if (body.importNow !== false) {
    importPlaylist(playlist.id).catch(() => {});
  }

  return NextResponse.json({ playlist: toPlaylistDTO(playlist) }, { status: 201 });
}
