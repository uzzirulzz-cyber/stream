import { NextRequest, NextResponse } from 'next/server';
import { trackTraffic } from '@/lib/monetization-extras';

export const dynamic = 'force-dynamic';

// POST /api/traffic — record a traffic event (page view, session, etc.)
// Body: { kind: 'page_view' | 'session_start' | 'channel_view' | 'search', path?: string, referrer?: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || 'page_view');
  await trackTraffic(kind, body.path, body.referrer);
  return NextResponse.json({ ok: true });
}
