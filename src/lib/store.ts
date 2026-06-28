'use client';

import { create } from 'zustand';
import type { ChannelDTO } from '@/lib/types';

export type ViewId =
  | 'landing'
  | 'home'
  | 'live'
  | 'football'
  | 'cricket'
  | 'wrestling'
  | 'other-sports'
  | 'movies'
  | 'music'
  | 'web-series'
  | 'events'
  | 'search'
  | 'favorites'
  | 'history'
  | 'notifications'
  | 'profile'
  | 'admin';

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
}

interface AppState {
  view: ViewId;
  adminTab: 'playlists' | 'channels' | 'categories' | 'analytics' | 'revenue' | 'ads' | 'settings';
  searchQuery: string;
  // player
  playerChannel: ChannelDTO | null;
  playerOpen: boolean;
  playerMinimized: boolean;
  // auth
  authUser: AuthUser | null;
  authOpen: boolean;
  authMode: 'login' | 'signup';
  // notifications
  unreadCount: number;
  // navigation
  setView: (v: ViewId) => void;
  setAdminTab: (t: AppState['adminTab']) => void;
  setSearchQuery: (q: string) => void;
  openPlayer: (ch: ChannelDTO) => void;
  closePlayer: () => void;
  minimizePlayer: (m: boolean) => void;
  // auth actions
  setAuthUser: (u: AuthUser | null) => void;
  openAuth: (mode: 'login' | 'signup') => void;
  closeAuth: () => void;
  // notifications
  setUnreadCount: (n: number) => void;
  // refresh trigger (bumped to refetch data)
  refreshTick: number;
  bumpRefresh: () => void;
}

/** Parse the current view from the URL ?view= param. */
function getViewFromUrl(): ViewId {
  if (typeof window === 'undefined') return 'landing';
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view') as ViewId | null;
  const valid: ViewId[] = ['landing', 'home', 'live', 'football', 'cricket', 'wrestling', 'other-sports', 'movies', 'music', 'web-series', 'events', 'search', 'favorites', 'history', 'notifications', 'profile', 'admin'];
  return valid.includes(v as ViewId) ? (v as ViewId) : 'landing';
}

export const useApp = create<AppState>((set) => ({
  view: typeof window !== 'undefined' ? getViewFromUrl() : 'landing',
  adminTab: 'playlists',
  searchQuery: '',
  playerChannel: null,
  playerOpen: false,
  playerMinimized: false,
  authUser: null,
  authOpen: false,
  authMode: 'login',
  unreadCount: 0,
  setView: (v) => {
    // Update URL query param so it's shareable/bookmarkable.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (v === 'landing') url.searchParams.delete('view');
      else url.searchParams.set('view', v);
      window.history.replaceState({}, '', url.toString());
    }
    set({ view: v });
  },
  setAdminTab: (t) => set({ adminTab: t, view: 'admin' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  openPlayer: (ch) => set({ playerChannel: ch, playerOpen: true, playerMinimized: false }),
  closePlayer: () => set({ playerOpen: false, playerChannel: null, playerMinimized: false }),
  minimizePlayer: (m) => set({ playerMinimized: m }),
  setAuthUser: (u) => set({ authUser: u }),
  openAuth: (mode) => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),
  setUnreadCount: (n) => set({ unreadCount: n }),
  refreshTick: 0,
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
