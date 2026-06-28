'use client';

import { useState, useEffect } from 'react';
import {
  Trophy, Target, Swords, Film, Music, MonitorPlay, Radio, Play,
  Search, Bell, Heart, Crown, ArrowRight, Check, Tv, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DownloadAppButton } from '@/components/download-app';
import { RandomSections } from '@/components/random-sections';
import { cn } from '@/lib/utils';

const HERO_SLIDES = [
  {
    image: '/hero-sports.jpg',
    title: 'Live Sports,',
    highlight: 'Without Limits',
    subtitle: 'Watch 14,000+ channels — Football, Cricket, WWE, UFC & more in full HD',
  },
  {
    image: '/hero-monsoon.jpg',
    title: 'Movies, Music &',
    highlight: 'Web Series',
    subtitle: 'Hollywood, Bollywood, MTV, Drama, Documentaries — all free, all the time',
  },
];

export function LandingView() {
  const setView = useApp((s) => s.setView);
  const openAuth = useApp((s) => s.openAuth);
  const [slide, setSlide] = useState(0);

  // Auto-rotate hero slides every 6 seconds.
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const sports = [
    { name: 'Football', icon: Trophy, color: 'text-emerald-500', desc: 'Premier League, Champions League, La Liga & more', view: 'football' as const },
    { name: 'Cricket', icon: Target, color: 'text-amber-500', desc: 'IPL, PSL, BBL, ICC Events, Test & T20', view: 'cricket' as const },
    { name: 'Wrestling', icon: Swords, color: 'text-rose-500', desc: 'WWE RAW, SmackDown, NXT, AEW, UFC', view: 'wrestling' as const },
    { name: 'Other Sports', icon: Tv, color: 'text-violet-500', desc: 'NBA, F1, Tennis, Boxing, MMA, Golf & more', view: 'other-sports' as const },
  ];

  const entertainment = [
    { name: 'Movies', icon: Film, color: 'text-rose-500', desc: 'Hollywood, Bollywood, Action, Comedy, Horror & Anime', view: 'movies' as const },
    { name: 'Music', icon: Music, color: 'text-purple-500', desc: 'Pop, Rock, Hip Hop, Classical, Electronic & World', view: 'music' as const },
    { name: 'Web Series', icon: MonitorPlay, color: 'text-cyan-500', desc: 'Drama, Thriller, Reality TV, Documentaries & News', view: 'web-series' as const },
  ];

  const features = [
    { icon: Radio, title: 'Live Streaming', desc: 'Watch 14,000+ channels live in HD with HLS adaptive playback' },
    { icon: Search, title: 'Smart Search', desc: 'Find channels by name, league, team, country, language or category' },
    { icon: Bell, title: 'Live Notifications', desc: 'Get notified when your favorite channels go live' },
    { icon: Heart, title: 'Favorites & History', desc: 'Save channels, resume playback, sync across devices' },
    { icon: Crown, title: '100% Free', desc: 'No subscription fee, no paywall, unlimited streaming' },
    { icon: Zap, title: 'Multi-M3U Engine', desc: 'Auto-merges 3 playlists, removes duplicates, refreshes every 6h' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="PlayBeat Arena" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-white">PlayBeat Arena</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => openAuth('login')} className="hidden text-white hover:bg-white/10 sm:flex">Log in</Button>
            <Button size="sm" onClick={() => openAuth('signup')} className="gap-1.5">Sign up free <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION — cinematic full-screen with rotating background images */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image carousel */}
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              opacity: i === slide ? 1 : 0,
              backgroundImage: `url(${s.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}

        {/* Dark gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />

        {/* Slide navigation dots */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === slide ? 'w-8 bg-brand' : 'w-2 bg-white/40 hover:bg-white/60',
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Arrow controls */}
        <button
          onClick={() => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60 sm:left-8"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setSlide((s) => (s + 1) % HERO_SLIDES.length)}
          className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60 sm:right-8"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-32 text-center sm:px-6">
          <img src="/logo.png" alt="PlayBeat Arena" className="mx-auto mb-6 h-20 w-20 rounded-2xl object-contain shadow-2xl sm:h-24 sm:w-24" />

          {/* Animated title — slides in on slide change */}
          <h1 key={slide} className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            {HERO_SLIDES[slide].title}{' '}
            {HERO_SLIDES[slide].highlight}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80 drop-shadow sm:text-lg">
            {HERO_SLIDES[slide].subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => setView('home')} className="gap-2 text-base shadow-2xl">
              <Play className="h-5 w-5 fill-current" /> Enter Platform
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView('live')} className="gap-2 border-white/30 bg-black/30 text-base text-white backdrop-blur hover:bg-black/50 hover:text-white">
              <Radio className="h-5 w-5 text-red-500" /> Watch Live Now
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> No ads on premium content</span>
            <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> Works on all devices</span>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center">
            <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-1.5">
              <div className="h-2 w-1 animate-bounce rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </section>

      {/* Sports Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Sports Categories</h2>
          <p className="mt-2 text-muted-foreground">Intelligently auto-categorized from your M3U playlists</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sports.map((s) => (
            <button
              key={s.name}
              onClick={() => setView(s.view)}
              className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-brand hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                Browse <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Entertainment Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Movies, Music & Web Series</h2>
          <p className="mt-2 text-muted-foreground">Related content auto-pulled from your playlists</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {entertainment.map((s) => (
            <button
              key={s.name}
              onClick={() => setView(s.view)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-left transition-all hover:border-brand hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="absolute -right-4 -top-4 opacity-5">
                <s.icon className="h-32 w-32" />
              </div>
              <div className="relative">
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{s.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Random motivational sections */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <RandomSections count={3} />
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Everything You Need to Stream</h2>
            <p className="mt-2 text-muted-foreground">Built-in monetization, SEO, notifications & more</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg brand-bg">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-br from-brand/15 via-card to-card p-8 text-center sm:p-16">
          <div className="absolute -right-8 -top-8 opacity-10">
            <img src="/logo.png" alt="" className="h-48 w-48 object-contain" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to Start Watching?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Join PlayBeat Arena — 100% free, no subscription, 14,000+ live channels.
              Create an account to save favorites, get notifications & sync across devices.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => setView('home')} className="gap-2 text-base">
                <Play className="h-5 w-5 fill-current" /> Start Watching Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => openAuth('signup')} className="gap-2 text-base">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          {/* Download app CTA */}
          <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/10 to-card p-5 sm:flex-row">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <img src="/android-chrome-192.png" alt="PlayBeat Arena" className="h-12 w-12 rounded-xl object-contain" />
              <div>
                <h3 className="text-base font-extrabold">Get the PlayBeat Arena App</h3>
                <p className="text-sm text-muted-foreground">Install on your phone — 14,000+ channels, live notifications, 100% free</p>
              </div>
            </div>
            <DownloadAppButton variant="landing" />
          </div>

          {/* Footer bottom */}
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="PlayBeat Arena" className="h-5 w-5 rounded object-contain" />
              <span className="font-semibold text-foreground">PlayBeat Arena</span>
              <span>· Multi-M3U Sports & Entertainment Streaming</span>
            </div>
            <p>© 2025 PlayBeat Arena · All channels free · No subscription</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
