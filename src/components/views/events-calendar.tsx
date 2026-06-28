'use client';

import { useState } from 'react';
import { Calendar, Clock, Trophy, Target, Swords, Film, Music, MonitorPlay, Star, DollarSign, Check, Lock } from 'lucide-react';
import { useFetch, apiAction } from '@/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  league: string | null;
  eventDate: string;
  eventTime: string;
  venue: string | null;
  imageUrl: string | null;
  streamUrl: string | null;
  ppvPriceCents: number;
  isPPV: boolean;
  status: string;
  featured: boolean;
  hasAccess: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Football: <Trophy className="h-5 w-5" />,
  Cricket: <Target className="h-5 w-5" />,
  Wrestling: <Swords className="h-5 w-5" />,
  Movies: <Film className="h-5 w-5" />,
  Music: <Music className="h-5 w-5" />,
  'Web Series': <MonitorPlay className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  Football: 'text-emerald-500',
  Cricket: 'text-amber-500',
  Wrestling: 'text-rose-500',
  Movies: 'text-purple-500',
  Music: 'text-pink-500',
  'Web Series': 'text-cyan-500',
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function EventsCalendar() {
  const { data, loading, refetch } = useFetch<{ events: EventItem[] }>('/api/events');
  const { openAuth, authUser } = useApp();
  const [filter, setFilter] = useState<string>('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const events = data?.events ?? [];

  // Group events by date
  const grouped: Record<string, EventItem[]> = {};
  for (const e of events) {
    const dateKey = new Date(e.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.category === filter);
  const filteredGrouped: Record<string, EventItem[]> = {};
  for (const e of filtered) {
    const dateKey = new Date(e.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!filteredGrouped[dateKey]) filteredGrouped[dateKey] = [];
    filteredGrouped[dateKey].push(e);
  }

  async function purchasePPV(event: EventItem) {
    if (!authUser) {
      openAuth('signup');
      return;
    }
    setPurchasing(event.id);
    const res = await apiAction('POST', `/api/events/${event.id}/purchase`);
    setPurchasing(null);
    if (res.ok) {
      toast.success(`PPV access purchased for ${formatMoney(event.ppvPriceCents)}! You can now watch.`);
      refetch();
    } else {
      toast.error(res.error || 'Purchase failed');
    }
  }

  const categories = ['all', 'Football', 'Cricket', 'Wrestling', 'Movies', 'Web Series', 'Music'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-brand">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Events Calendar</h1>
            <p className="text-sm text-muted-foreground">Upcoming matches, premieres & PPV events — add to your calendar</p>
          </div>
        </div>
        <Badge variant="secondary" className="w-fit">{events.length} upcoming events</Badge>
      </div>

      {/* Category filter */}
      <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === cat ? 'border-brand bg-brand text-brand-foreground' : 'border-border hover:bg-muted',
            )}
          >
            {cat === 'all' ? 'All Events' : cat}
          </button>
        ))}
      </div>

      {/* Events grouped by date */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No upcoming events</p>
          <p className="mt-1 text-sm text-muted-foreground">Check back soon for new events!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGrouped).map(([dateKey, dayEvents]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-bg">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide">{dateKey}</h2>
                <span className="text-xs text-muted-foreground">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
              </div>

              {/* Event cards */}
              <div className="grid grid-cols-1 gap-3">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md sm:flex-row sm:items-center',
                      event.featured ? 'border-brand/40' : 'border-border',
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted', CATEGORY_COLORS[event.category])}>
                      {CATEGORY_ICONS[event.category] || <Star className="h-5 w-5" />}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold">{event.title}</h3>
                        {event.featured && <Badge className="brand-bg text-[9px]">FEATURED</Badge>}
                        {event.isPPV && <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px]">PPV</Badge>}
                      </div>
                      {event.description && <p className="truncate text-xs text-muted-foreground">{event.description}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {event.eventTime}</span>
                        {event.league && <Badge variant="outline" className="text-[9px]">{event.league}</Badge>}
                        {event.venue && <span className="truncate">{event.venue}</span>}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {event.isPPV ? (
                        event.hasAccess ? (
                          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> Access Granted
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => purchasePPV(event)}
                            disabled={purchasing === event.id}
                            className="gap-1.5"
                          >
                            {purchasing === event.id ? 'Processing…' : (
                              <>
                                <Lock className="h-3.5 w-3.5" /> Buy PPV · {formatMoney(event.ppvPriceCents)}
                              </>
                            )}
                          </Button>
                        )
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Free
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
