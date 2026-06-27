'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { apiAction } from '@/hooks/use-fetch';
import { useApp } from '@/lib/store';
import type { AdSlotDTO } from '@/lib/types';

const INTERSTITIAL_KEY = 'pb_interstitial_shown';
const COOLDOWN_MS = 5 * 60 * 1000; // show at most once per 5 minutes

/**
 * Full-screen interstitial ad shown between navigations (not on every view).
 * Respects a cooldown so users aren't bombarded.
 */
export function InterstitialAd() {
  const view = useApp((s) => s.view);
  const [show, setShow] = useState(false);
  const [ad, setAd] = useState<AdSlotDTO | null>(null);
  const [countdown, setCountdown] = useState(5);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip on home (first load), admin, profile.
    if (view === 'home' || view === 'admin' || view === 'profile') return;

    // Check cooldown in localStorage.
    const lastShown = typeof window !== 'undefined' ? localStorage.getItem(INTERSTITIAL_KEY) : null;
    if (lastShown && Date.now() - Number(lastShown) < COOLDOWN_MS) return;

    let active = true;
    // Fetch an interstitial ad, then show it.
    fetch('/api/ads/serve?placement=interstitial')
      .then((r) => r.json())
      .then((d: { ad: AdSlotDTO | null }) => {
        if (active && d.ad) {
          setAd(d.ad);
          setShow(true);
          setCountdown(5);
          localStorage.setItem(INTERSTITIAL_KEY, String(Date.now()));
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [view]);

  // Countdown timer.
  useEffect(() => {
    if (!show || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [show, countdown]);

  // Track impression once.
  useEffect(() => {
    if (show && ad && trackedRef.current !== ad.id) {
      trackedRef.current = ad.id;
      apiAction('POST', `/api/ads/${ad.id}/track`, { kind: 'impression' });
    }
  }, [show, ad]);

  if (!show || !ad) return null;

  async function handleClick() {
    if (!ad) return;
    await apiAction('POST', `/api/ads/${ad.id}/track`, { kind: 'click' });
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    setShow(false);
  }

  function close() {
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
        {/* top bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Advertisement
          </span>
          <button
            onClick={close}
            disabled={countdown > 0}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {countdown > 0 ? `Skip in ${countdown}s` : <><X className="h-3.5 w-3.5" /> Skip</>}
          </button>
        </div>

        {/* ad content */}
        <button onClick={handleClick} className="block w-full p-6 text-left transition-colors hover:bg-muted/30">
          <div className="flex items-center gap-4">
            {ad.imageUrl ? (
              <img src={ad.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl brand-bg">
                <Megaphone className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold tracking-tight sm:text-xl">{ad.headline || ad.name}</h3>
              {ad.description && <p className="mt-1 text-sm text-muted-foreground">{ad.description}</p>}
              <span className="mt-3 inline-flex items-center gap-1 rounded-lg brand-bg px-4 py-2 text-sm font-semibold">
                {ad.cta} <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
