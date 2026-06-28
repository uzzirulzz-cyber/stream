'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { useApp } from '@/lib/store';
import { LandingView } from '@/components/views/landing-view';
import { HomeView } from '@/components/views/home-view';
import { CategoryView } from '@/components/views/category-view';
import { SearchView } from '@/components/views/search-view';
import { LibraryView } from '@/components/views/library-view';
import { ProfileView } from '@/components/views/profile-view';
import { AdminView } from '@/components/views/admin-view';
import { EventsCalendar } from '@/components/views/events-calendar';
import { AuthDialog } from '@/components/auth-dialog';
import { IptvPlayer } from '@/components/iptv-player';
import { apiAction } from '@/hooks/use-fetch';

export default function Home() {
  const view = useApp((s) => s.view);
  const searchQuery = useApp((s) => s.searchQuery);
  const setView = useApp((s) => s.setView);

  // Ensure the database is seeded on first load + track page view for RPM.
  useEffect(() => {
    apiAction('POST', '/api/seed').catch(() => {});
    fetch('/api/revenue?track=pageview', { method: 'GET' }).catch(() => {});
    apiAction('POST', '/api/traffic', { kind: 'session_start', path: '/' }).catch(() => {});
  }, []);

  // Track page view on every view change (drives RPM + revenue estimator).
  useEffect(() => {
    apiAction('POST', '/api/traffic', { kind: 'page_view', path: `/?view=${view}` }).catch(() => {});
  }, [view]);

  // Sync view with browser back/forward (popstate).
  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v) setView(v as never);
      else setView('landing');
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setView]);

  // Landing page is full-screen (no app shell) — but still needs AuthDialog + Player.
  if (view === 'landing') {
    return (
      <>
        <LandingView />
        <AuthDialog />
        <IptvPlayer />
      </>
    );
  }

  return (
    <AppShell>
      {view === 'home' && <HomeView />}
      {view === 'live' && <CategoryView viewId="live" />}
      {view === 'football' && <CategoryView viewId="football" />}
      {view === 'cricket' && <CategoryView viewId="cricket" />}
      {view === 'wrestling' && <CategoryView viewId="wrestling" />}
      {view === 'other-sports' && <CategoryView viewId="other-sports" />}
      {view === 'movies' && <CategoryView viewId="movies" />}
      {view === 'music' && <CategoryView viewId="music" />}
      {view === 'web-series' && <CategoryView viewId="web-series" />}
      {view === 'events' && <EventsCalendar />}
      {view === 'search' && <SearchView key={searchQuery} />}
      {view === 'favorites' && <LibraryView mode="favorites" />}
      {view === 'history' && <LibraryView mode="history" />}
      {view === 'profile' && <ProfileView />}
      {view === 'admin' && <AdminView />}
    </AppShell>
  );
}
