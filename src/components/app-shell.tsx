'use client';

import { useState, useEffect } from 'react';
import {
  Home, Radio, Trophy, Target, Swords, Medal, Search, Heart,
  History, Settings, Menu, Sun, Moon, Tv, RefreshCw, X, UserCircle, Bell,
  Film, Music, MonitorPlay, Calendar,
} from 'lucide-react';
import { useApp, type ViewId } from '@/lib/store';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { IptvPlayer } from './iptv-player';
import { AuthDialog } from './auth-dialog';
import { UserMenu } from './user-menu';
import { NotificationsBell } from './notifications-bell';
import { InterstitialAd } from './interstitial-ad';
import { DownloadAppButton } from './download-app';
import { StickyBottomAd } from './sticky-bottom-ad';
import { RevenueTicker } from './revenue-ticker';
import { useFetch } from '@/hooks/use-fetch';
import { apiAction } from '@/hooks/use-fetch';
import { toast } from 'sonner';
import type { AnalyticsDTO } from '@/lib/types';

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}

const SPORTS_NAV: NavItem[] = [
  { id: 'football', label: 'Football', icon: <Trophy className="h-4 w-4" />, accent: 'text-emerald-500' },
  { id: 'cricket', label: 'Cricket', icon: <Target className="h-4 w-4" />, accent: 'text-amber-500' },
  { id: 'wrestling', label: 'Wrestling', icon: <Swords className="h-4 w-4" />, accent: 'text-rose-500' },
  { id: 'other-sports', label: 'Other Sports', icon: <Medal className="h-4 w-4" />, accent: 'text-violet-500' },
];

const ENTERTAINMENT_NAV: NavItem[] = [
  { id: 'movies', label: 'Movies', icon: <Film className="h-4 w-4" />, accent: 'text-rose-500' },
  { id: 'music', label: 'Music', icon: <Music className="h-4 w-4" />, accent: 'text-purple-500' },
  { id: 'web-series', label: 'Web Series', icon: <MonitorPlay className="h-4 w-4" />, accent: 'text-cyan-500' },
];

const MAIN_NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { id: 'live', label: 'Live Now', icon: <Radio className="h-4 w-4" />, accent: 'text-red-500' },
  { id: 'events', label: 'Events Calendar', icon: <Calendar className="h-4 w-4" />, accent: 'text-amber-500' },
];

const LIBRARY_NAV: NavItem[] = [
  { id: 'favorites', label: 'Favorites', icon: <Heart className="h-4 w-4" /> },
  { id: 'history', label: 'Watch History', icon: <History className="h-4 w-4" /> },
  { id: 'profile', label: 'My Profile', icon: <UserCircle className="h-4 w-4" /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, setAdminTab } = useApp();
  const refreshTick = useApp((s) => s.refreshTick);
  const { data: analytics } = useFetch<AnalyticsDTO>('/api/analytics', [refreshTick]);
  const [importing, setImporting] = useState(false);

  function go(v: ViewId) {
    setView(v);
    onNavigate?.();
  }

  async function refreshAll() {
    setImporting(true);
    toast.info('Refreshing all playlists…');
    const res = await apiAction('POST', '/api/import');
    setImporting(false);
    if (res.ok) {
      toast.success('Playlists refreshed');
      useApp.getState().bumpRefresh();
    } else {
      toast.error(res.error || 'Refresh failed');
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* brand */}
      <button
        onClick={() => go('home')}
        className="flex items-center gap-2.5 px-4 py-5"
      >
        <img
          src="/logo.png"
          alt="PlayBeat Arena"
          className="h-10 w-10 rounded-lg object-contain"
        />
        <div className="text-left">
          <p className="text-base font-extrabold leading-none tracking-tight">PlayBeat Arena</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Multi-M3U IPTV</p>
        </div>
      </button>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scroll-thin">
        {/* main */}
        <NavGroup label="Browse">
          {MAIN_NAV.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
          ))}
        </NavGroup>

        {/* sports */}
        <NavGroup label="Sports">
          {SPORTS_NAV.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
          ))}
        </NavGroup>

        {/* entertainment */}
        <NavGroup label="Entertainment">
          {ENTERTAINMENT_NAV.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
          ))}
        </NavGroup>

        {/* library */}
        <NavGroup label="Library">
          {LIBRARY_NAV.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => go(item.id)} />
          ))}
        </NavGroup>

        {/* admin */}
        <NavGroup label="Management">
          <NavButton
            item={{ id: 'admin', label: 'Admin Panel', icon: <Settings className="h-4 w-4" /> }}
            active={view === 'admin'}
            onClick={() => { setAdminTab('playlists'); go('admin'); }}
          />
        </NavGroup>
      </nav>

      {/* stats footer */}
      <div className="border-t border-border p-3">
        <div className="mb-2 grid grid-cols-3 gap-1.5 text-center">
          <Stat label="Channels" value={analytics?.totalChannels ?? '—'} />
          <Stat label="Live" value={analytics?.liveNowChannels ?? '—'} accent="text-red-500" />
          <Stat label="Sources" value={analytics?.totalPlaylists ?? '—'} />
        </div>
        <Button
          onClick={refreshAll}
          disabled={importing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', importing && 'animate-spin')} />
          {importing ? 'Refreshing…' : 'Refresh Playlists'}
        </Button>
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span className={cn(!active && item.accent)}>{item.icon}</span>
      {item.label}
    </button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 py-1.5">
      <p className={cn('text-sm font-bold', accent)}>{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function TopBar() {
  const { setView, setSearchQuery } = useApp();
  const authUser = useApp((s) => s.authUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState('');
  const { theme, setTheme } = useTheme();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(q);
    setView('search');
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-lg">
      {/* mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* search */}
      <form onSubmit={submitSearch} className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search channels, leagues, teams, countries…"
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <RevenueTicker isAdmin={authUser?.role === 'super_admin' || authUser?.role === 'admin'} />
        <NotificationsBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-sidebar lg:block">
          <SidebarContent />
        </aside>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <Footer />
        </div>
      </div>

      <IptvPlayer />
      <AuthDialog />
      <InterstitialAd />
      <StickyBottomAd />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="PlayBeat Arena" className="h-5 w-5 rounded object-contain" />
            <span className="font-semibold text-foreground">PlayBeat Arena</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">· Multi-M3U Sports Streaming</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <p className="hidden text-sm text-muted-foreground md:block">Auto-refresh every 6h · HLS adaptive streaming</p>
          <DownloadAppButton variant="footer" />
        </div>
      </div>
    </footer>
  );
}
