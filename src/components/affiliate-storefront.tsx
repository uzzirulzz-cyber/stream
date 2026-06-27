'use client';

import { ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
import { useFetch, apiAction } from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AffiliateLinkDTO } from '@/lib/monetization-extras';

const CATEGORY_LABELS: Record<string, string> = {
  betting: 'Sports Betting',
  merchandise: 'Merchandise',
  vpn: 'Streaming Tools',
  streaming_gear: 'Streaming Gear',
  ticketing: 'Match Tickets',
  fantasy: 'Fantasy Sports',
  other: 'Partners',
};

const CATEGORY_COLORS: Record<string, string> = {
  betting: 'text-emerald-500',
  merchandise: 'text-amber-500',
  vpn: 'text-cyan-500',
  streaming_gear: 'text-violet-500',
  ticketing: 'text-rose-500',
  fantasy: 'text-orange-500',
  other: 'text-brand',
};

export function AffiliateStorefront({ limit = 6 }: { limit?: number }) {
  const { data, loading } = useFetch<{ affiliates: AffiliateLinkDTO[] }>('/api/affiliates');

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  const affiliates = (data?.affiliates ?? []).slice(0, limit);
  if (affiliates.length === 0) return null;

  async function handleClick(a: AffiliateLinkDTO) {
    await apiAction('POST', `/api/affiliates/${a.id}/click`);
    window.open(a.targetUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-bold">Partner Offers</h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Supports the platform
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {affiliates.map((a) => (
          <button
            key={a.id}
            onClick={() => handleClick(a)}
            className="group flex items-start gap-2.5 rounded-lg border border-border p-3 text-left transition-all hover:border-brand hover:bg-brand/5"
          >
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted', CATEGORY_COLORS[a.category] || 'text-brand')}>
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-xs font-bold">{a.headline}</p>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{a.description}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className={cn('text-[10px] font-semibold uppercase', CATEGORY_COLORS[a.category])}>
                  {CATEGORY_LABELS[a.category] || 'Partner'}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                  {a.cta} <ExternalLink className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
