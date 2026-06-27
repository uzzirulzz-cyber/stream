'use client';

import { Radio, Trophy, Target, Swords, Flame, Clock, Heart, CalendarClock, ChevronRight, Tv, Sparkles, Lightbulb, Crown } from 'lucide-react';
import { useFetch } from '@/hooks/use-fetch';
import { useApp } from '@/lib/store';
import { ChannelRail } from '@/components/channel-rail';
import { AdBanner } from '@/components/ad-banner';
import { HashtagsWidget } from '@/components/hashtags-widget';
import { AffiliateStorefront } from '@/components/affiliate-storefront';
import { DonationWidget } from '@/components/donation-widget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ChannelDTO } from '@/lib/types';

interface HomeData {
  hero: ChannelDTO | null;
  liveNow: ChannelDTO[];
  featuredFootball: ChannelDTO[];
  featuredCricket: ChannelDTO[];
  featuredWrestling: ChannelDTO[];
  trending: ChannelDTO[];
  recentlyAdded: ChannelDTO[];
  continueWatching: (ChannelDTO & { position?: number; updatedAt?: string })[];
  favorites: ChannelDTO[];
  recommended: ChannelDTO[];
  recommendedBased: string[];
  upcoming: { title: string; league: string; time: string; category: string }[];
}

export function HomeView() {
  const refreshTick = useApp((s) => s.refreshTick);
  const { data, loading } = useFetch<HomeData>('/api/home', [refreshTick]);
  const { openPlayer, setView } = useApp();

  const hero = data?.hero;

  return (
    <div className="space-y-2">
      {/* Hero */}
      {loading && !hero ? (
        <div className="mb-8 h-64 animate-pulse rounded-2xl bg-muted sm:h-80" />
      ) : hero ? (
        <HeroBanner channel={hero} onPlay={() => openPlayer(hero)} />
      ) : null}

      {/* Home leaderboard ad */}
      <div className="mb-8">
        <AdBanner placement="banner-home" />
      </div>

      {/* Upcoming events strip */}
      {data?.upcoming && data.upcoming.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Upcoming Events</h2>
          </div>
          <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
            {data.upcoming.map((ev, i) => (
              <div
                key={i}
                className="w-64 shrink-0 rounded-xl border border-border bg-card p-3 transition-colors hover:border-brand"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">{ev.category}</Badge>
                  <span className="text-[11px] font-medium text-brand">{ev.time}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{ev.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ev.league}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Continue watching */}
      {data?.continueWatching && data.continueWatching.length > 0 && (
        <ChannelRail
          title="Continue Watching"
          icon={<Clock className="h-4 w-4" />}
          channels={data.continueWatching}
          loading={loading}
        />
      )}

      {/* Live now */}
      <ChannelRail
        title="Live Now"
        icon={<Radio className="h-4 w-4" />}
        accent="text-red-500"
        channels={data?.liveNow ?? []}
        loading={loading}
        action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('live')}>
            View all <ChevronRight className="h-3 w-3" />
          </Button>
        }
      />

      {/* Featured football */}
      <ChannelRail
        title="Featured Football"
        icon={<Trophy className="h-4 w-4" />}
        accent="text-emerald-500"
        channels={data?.featuredFootball ?? []}
        loading={loading}
        action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('football')}>
            More <ChevronRight className="h-3 w-3" />
          </Button>
        }
      />

      {/* Featured cricket */}
      <ChannelRail
        title="Featured Cricket"
        icon={<Target className="h-4 w-4" />}
        accent="text-amber-500"
        channels={data?.featuredCricket ?? []}
        loading={loading}
        action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('cricket')}>
            More <ChevronRight className="h-3 w-3" />
          </Button>
        }
      />

      {/* Featured wrestling */}
      <ChannelRail
        title="Featured Wrestling"
        icon={<Swords className="h-4 w-4" />}
        accent="text-rose-500"
        channels={data?.featuredWrestling ?? []}
        loading={loading}
        action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('wrestling')}>
            More <ChevronRight className="h-3 w-3" />
          </Button>
        }
      />

      {/* Trending */}
      <ChannelRail
        title="Trending Channels"
        icon={<Flame className="h-4 w-4" />}
        accent="text-orange-500"
        channels={data?.trending ?? []}
        loading={loading}
      />

      {/* Recommended */}
      {data?.recommended && data.recommended.length > 0 && (
        <ChannelRail
          title="Recommended For You"
          icon={<Lightbulb className="h-4 w-4" />}
          accent="text-brand"
          channels={data.recommended}
          loading={loading}
        />
      )}

      {/* Favorites */}
      {data?.favorites && data.favorites.length > 0 && (
        <ChannelRail
          title="Your Favorites"
          icon={<Heart className="h-4 w-4" />}
          accent="text-red-500"
          channels={data.favorites}
          action={
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('favorites')}>
              All favorites <ChevronRight className="h-3 w-3" />
            </Button>
          }
        />
      )}

      {/* Recently added */}
      <ChannelRail
        title="Recently Added"
        icon={<Sparkles className="h-4 w-4" />}
        channels={data?.recentlyAdded ?? []}
        loading={loading}
      />

      {/* Sponsored rail ad */}
      <div className="mb-8">
        <AdBanner placement="sponsored-rail" />
      </div>

      {/* Free access banner + trending hashtags grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FreeAccessBanner />
        </div>
        <HashtagsWidget />
      </div>

      {/* Monetization: affiliate storefront + donation widget */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AffiliateStorefront limit={6} />
        </div>
        <DonationWidget />
      </div>

      {/* empty state */}
      {!loading && data && !hero && data.liveNow.length === 0 && data.trending.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Tv className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No content yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add M3U playlists in the Admin Panel to start streaming.
          </p>
          <Button className="mt-4" onClick={() => setView('admin')}>Go to Admin</Button>
        </div>
      )}
    </div>
  );
}

function HeroBanner({ channel, onPlay }: { channel: ChannelDTO; onPlay: () => void }) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-border">
      {/* background */}
      <div className="absolute inset-0">
        {channel.logo ? (
           
          <img
            src={channel.logo}
            alt=""
            className="h-full w-full object-cover opacity-20 blur-2xl"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* content */}
      <div className="relative flex flex-col gap-4 p-6 sm:p-8 lg:p-10">
        <div className="flex items-center gap-2">
          {channel.liveNow && (
            <Badge className="bg-red-600 text-white hover:bg-red-600">
              <Radio className="mr-1 h-3 w-3 live-dot" /> LIVE NOW
            </Badge>
          )}
          <Badge variant="secondary">{channel.category}</Badge>
          {channel.subcategory && <Badge variant="outline">{channel.subcategory}</Badge>}
        </div>

        <div className="flex items-start gap-4">
          {channel.logo && (
             
            <img
              src={channel.logo}
              alt={channel.displayName}
              className="hidden h-24 w-24 rounded-xl border border-border bg-card object-contain p-2 sm:block"
            />
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              {channel.displayName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Stream {channel.displayName} live in HD. Auto-categorized under{' '}
              <span className="font-medium text-foreground">{channel.category}</span>
              {channel.subcategory ? ` / ${channel.subcategory}` : ''} from {channel.sourceName}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {channel.country && <span className="rounded bg-muted px-2 py-1">{channel.country}</span>}
              {channel.language && <span className="rounded bg-muted px-2 py-1">{channel.language}</span>}
              <span className="rounded bg-muted px-2 py-1">Source: {channel.sourceName}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={onPlay} className="gap-2">
            <Radio className="h-4 w-4" /> Watch Live
          </Button>
        </div>
      </div>
    </section>
  );
}

function FreeAccessBanner() {
  const openAuth = useApp((s) => s.openAuth);
  const authUser = useApp((s) => s.authUser);
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/15 via-card to-card p-6">
      <div className="absolute -right-8 -top-8 opacity-10">
        <Crown className="h-40 w-40" />
      </div>
      <div className="relative">
        <Badge className="brand-bg mb-3 gap-1">
          <Crown className="h-3 w-3" /> 100% Free
        </Badge>
        <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          All Sports. All Channels. No Subscription Fee.
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Watch every Premier League, IPL, WWE & UFC event live in HD — completely free.
          Create an account to save favorites, get live notifications & sync across devices.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!authUser ? (
            <>
              <Button onClick={() => openAuth('signup')} className="gap-2">
                <Crown className="h-4 w-4" /> Sign Up Free
              </Button>
              <span className="text-xs text-muted-foreground">No credit card · No subscription · Unlimited streaming</span>
            </>
          ) : (
            <span className="text-sm font-medium text-brand">✓ You're all set — enjoy unlimited free streaming!</span>
          )}
        </div>
      </div>
    </div>
  );
}
