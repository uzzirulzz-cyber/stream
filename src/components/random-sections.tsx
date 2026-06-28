'use client';

import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Bird, DollarSign, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

interface SectionCard {
  image: string;
  title: string;
  quote: string;
  cta: string;
  icon: React.ReactNode;
  accent: string;
  view?: string;
}

const SECTIONS: SectionCard[] = [
  {
    image: '/section-motivational.jpg',
    title: 'Rise Above Limits',
    quote: 'The only limit is the one you set yourself. Watch champions in action and get inspired.',
    cta: 'Watch Live Sports',
    icon: <Bird className="h-5 w-5" />,
    accent: 'from-amber-500/30',
    view: 'live',
  },
  {
    image: '/section-rich-mindset.jpg',
    title: 'Think Like a Champion',
    quote: 'Success starts in the mind. Stream the biggest games, matches & fights — free, 24/7.',
    cta: 'Explore Categories',
    icon: <TrendingUp className="h-5 w-5" />,
    accent: 'from-emerald-500/30',
    view: 'home',
  },
  {
    image: '/section-action.jpg',
    title: 'Non-Stop Action',
    quote: 'Football, Cricket, WWE, UFC — every thrill, every goal, every knockout. Never miss a moment.',
    cta: 'Watch Now',
    icon: <Flame className="h-5 w-5" />,
    accent: 'from-rose-500/30',
    view: 'football',
  },
  {
    image: '/section-calamar.jpg',
    title: 'Squid Game Mode',
    quote: 'Survive the hype. The most intense matches, the biggest rivalries — all in one place.',
    cta: 'Join the Arena',
    icon: <Trophy className="h-5 w-5" />,
    accent: 'from-violet-500/30',
    view: 'wrestling',
  },
  {
    image: '/section-jsg.jpg',
    title: 'JSG Sports Network',
    quote: 'Your gateway to global sports entertainment. Movies, music, web series & live games.',
    cta: 'Browse All',
    icon: <Sparkles className="h-5 w-5" />,
    accent: 'from-cyan-500/30',
    view: 'movies',
  },
  {
    image: '/section-minimal.jpg',
    title: 'Stream in Style',
    quote: 'Clean, fast, ad-light. PlayBeat Arena delivers 14,000+ channels in beautiful HD.',
    cta: 'Start Watching',
    icon: <DollarSign className="h-5 w-5" />,
    accent: 'from-purple-500/30',
    view: 'home',
  },
  {
    image: '/section-sports-1.jpg',
    title: 'Game Day Every Day',
    quote: 'Live matches around the clock. Premier League, IPL, UFC, F1 — all free, no subscription.',
    cta: 'Live Now',
    icon: <Flame className="h-5 w-5" />,
    accent: 'from-orange-500/30',
    view: 'live',
  },
  {
    image: '/section-sports-2.jpg',
    title: 'Unstoppable Entertainment',
    quote: 'From the stadium to your screen. Every sport, every league, every moment — in HD.',
    cta: 'Explore',
    icon: <TrendingUp className="h-5 w-5" />,
    accent: 'from-blue-500/30',
    view: 'other-sports',
  },
];

/**
 * Random content sections — displays motivational/featured image cards
 * between channel rails. Shuffles on each page load for variety.
 */
export function RandomSections({ count = 3 }: { count?: number }) {
  const setView = useApp((s) => s.setView);
  const [sections, setSections] = useState<SectionCard[]>([]);

  useEffect(() => {
    // Shuffle sections and pick `count` of them.
    const shuffled = [...SECTIONS].sort(() => Math.random() - 0.5);
    setSections(shuffled.slice(0, count));
  }, [count]);

  if (sections.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      {sections.map((section, i) => (
        <div
          key={i}
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r to-card',
            section.accent,
          )}
        >
          {/* Background image */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={section.image}
              alt={section.title}
              className="h-full w-full object-cover opacity-30 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-40"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
            {/* Icon badge */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/80 backdrop-blur">
              {section.icon}
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{section.title}</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:text-base">{section.quote}</p>
            </div>

            {/* CTA */}
            {section.view && (
              <button
                onClick={() => setView(section.view as never)}
                className="shrink-0 rounded-xl brand-bg px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105"
              >
                <span className="flex items-center gap-1.5">
                  {section.cta} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
