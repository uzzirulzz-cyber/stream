import { NextRequest, NextResponse } from 'next/server';
import { firewallFetch, checkRateLimit } from '@/lib/firewall';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/proxy/stream?url=ENCODED_URL
 *
 * Firewall-protected stream proxy that:
 * 1. Fetches the manifest/segment with rotating UAs + referer spoofing
 * 2. REWRITES HLS manifests so all segment URLs also go through this proxy
 *    (this is the key fix — without it, segments are fetched directly by
 *     the browser and get geo-blocked even though the manifest loaded)
 * 3. Serves cached manifests when origin is down
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  if (!targetUrl) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const result = await firewallFetch(targetUrl);
    const contentType = result.contentType;

    // If this is an HLS manifest (.m3u8), rewrite all URLs to go through proxy
    const isM3u8 = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') ||
                   targetUrl.includes('.m3u8') || contentType.includes('text/plain');

    if (isM3u8) {
      let manifestText = result.body.toString('utf-8');

      // Determine the base URL for resolving relative paths
      let baseUrl: string;
      try {
        const parsed = new URL(targetUrl);
        baseUrl = parsed.href.substring(0, parsed.href.lastIndexOf('/') + 1);
      } catch {
        baseUrl = '';
      }

      // Rewrite all URLs in the manifest to go through our proxy
      const proxyBase = '/api/proxy/stream?url=';

      // Split by lines and rewrite each URL line
      manifestText = manifestText.split('\n').map((line) => {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          // Rewrite URI= attributes in #EXT-X-KEY, #EXT-X-MAP, etc.
          if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
              const absoluteUrl = resolveUrl(uri, targetUrl, baseUrl);
              return `URI="${proxyBase}${encodeURIComponent(absoluteUrl)}"`;
            });
          }
          return line;
        }

        // This is a URL line — rewrite it
        const absoluteUrl = resolveUrl(trimmed, targetUrl, baseUrl);
        return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
      }).join('\n');

      return new NextResponse(manifestText, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-cache',
          'X-Firewall': 'active',
          'X-Firewall-Rewritten': 'true',
          'X-Firewall-Source': result.source,
          'X-Firewall-Cached': result.cached ? 'true' : 'false',
        },
      });
    }

    // Non-manifest content (video segments, etc.) — return as-is
    return new NextResponse(result.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache',
        'X-Firewall': 'active',
        'X-Firewall-Source': result.source,
        'X-Firewall-Cached': result.cached ? 'true' : 'false',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Firewall could not reach stream — origin is offline or heavily blocked' },
      { status: 502 },
    );
  }
}

/** Resolve a URL (relative or absolute) against the base. */
function resolveUrl(url: string, originalUrl: string, baseUrl: string): string {
  // Already absolute with http/https
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  // Protocol-relative (//example.com/path)
  if (url.startsWith('//')) {
    try {
      const proto = new URL(originalUrl).protocol;
      return `${proto}${url}`;
    } catch {
      return `https:${url}`;
    }
  }
  // Absolute path (/path)
  if (url.startsWith('/')) {
    try {
      const parsed = new URL(originalUrl);
      return `${parsed.origin}${url}`;
    } catch {
      return url;
    }
  }
  // Relative path (path/to/file.ts)
  return `${baseUrl}${url}`;
}
