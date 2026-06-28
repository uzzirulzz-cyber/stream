'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, CheckCircle2, AlertTriangle, Loader2, Clock, Lock, ListVideo, History } from 'lucide-react';
import { useFetch, apiAction } from '@/hooks/use-fetch';
import { useApp } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { PlaylistDTO } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PlaylistsTab() {
  const refreshTick = useApp((s) => s.refreshTick);
  const bumpRefresh = useApp((s) => s.bumpRefresh);
  const { data, loading, refetch } = useFetch<{ playlists: PlaylistDTO[] }>('/api/playlists', [refreshTick]);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const playlists = data?.playlists ?? [];

  async function refreshOne(id: string) {
    setRefreshingId(id);
    toast.info('Refreshing playlist…');
    const res = await apiAction('POST', `/api/playlists/${id}/refresh`);
    setRefreshingId(null);
    if (res.ok) {
      const r = (res.data as { result?: { imported: number; duplicates: number } }).result;
      toast.success(`Imported ${r?.imported ?? 0} channels (${r?.duplicates ?? 0} duplicates)`);
      bumpRefresh();
      refetch();
    } else {
      toast.error(res.error || 'Refresh failed');
    }
  }

  async function refreshAll() {
    setRefreshingId('all');
    toast.info('Refreshing all playlists…');
    const res = await apiAction('POST', '/api/import');
    setRefreshingId(null);
    if (res.ok) {
      toast.success('All playlists refreshed');
      bumpRefresh();
      refetch();
    } else {
      toast.error(res.error || 'Refresh failed');
    }
  }

  return (
    <div className="space-y-4">
      {/* actions */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {playlists.length}/3 playlists configured. Auto-refresh runs every 6 hours.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshingId === 'all'}>
            {refreshingId === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh all
          </Button>
          <AddPlaylistDialog open={addOpen} onOpenChange={setAddOpen} onAdded={() => { bumpRefresh(); refetch(); }} />
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((pl) => (
            <PlaylistRow
              key={pl.id}
              playlist={pl}
              refreshing={refreshingId === pl.id}
              onRefresh={() => refreshOne(pl.id)}
              onChanged={() => { bumpRefresh(); refetch(); }}
            />
          ))}
          {playlists.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No playlists yet. Add your first M3U source.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlaylistRow({
  playlist, refreshing, onRefresh, onChanged,
}: {
  playlist: PlaylistDTO;
  refreshing: boolean;
  onRefresh: () => void;
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const health = playlist.channelCount > 0 ? Math.round((playlist.onlineCount / playlist.channelCount) * 100) : 0;

  const statusMeta = {
    active: { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
    refreshing: { label: 'Refreshing', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: Loader2 },
    error: { label: 'Error', cls: 'bg-red-500/15 text-red-600 dark:text-red-400', icon: AlertTriangle },
    disabled: { label: 'Disabled', cls: 'bg-muted text-muted-foreground', icon: AlertTriangle },
  }[playlist.status] ?? { label: playlist.status, cls: 'bg-muted text-muted-foreground', icon: AlertTriangle };

  async function toggleEnabled() {
    const res = await apiAction('PATCH', `/api/playlists/${playlist.id}`, { enabled: !playlist.enabled });
    if (res.ok) { toast.success(playlist.enabled ? 'Playlist disabled' : 'Playlist enabled'); onChanged(); }
    else toast.error(res.error || 'Failed');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ListVideo className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="font-bold leading-tight">{playlist.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span className="text-[11px]">Source hidden · {playlist.channelCount} channels</span>
              </div>
            </div>
            <Badge className={cn('gap-1', statusMeta.cls)}>
              <statusMeta.icon className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing' : statusMeta.label}
            </Badge>
          </div>

          {playlist.errorMessage && (
            <p className="mt-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-400">
              {playlist.errorMessage}
            </p>
          )}

          {/* stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Channels" value={playlist.channelCount} />
            <Stat label="Online" value={playlist.onlineCount} accent="text-emerald-500" />
            <Stat label="Offline" value={playlist.offlineCount} accent="text-red-500" />
            <Stat label="Health" value={`${health}%`} accent={health > 70 ? 'text-emerald-500' : health > 40 ? 'text-amber-500' : 'text-red-500'} />
          </div>

          {/* last refresh */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {playlist.lastRefreshAt
              ? `Last refresh: ${new Date(playlist.lastRefreshAt).toLocaleString()} (${playlist.lastRefreshMs}ms)`
              : 'Never refreshed'}
            {playlist.nextRefreshAt && (
              <span className="ml-2">· Next: {new Date(playlist.nextRefreshAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <ImportHistoryDialog playlistId={playlist.id} />
          <EditPlaylistDialog playlist={playlist} open={editOpen} onOpenChange={setEditOpen} onSaved={onChanged} />
          <Button size="sm" variant="outline" onClick={toggleEnabled}>
            {playlist.enabled ? 'Disable' : 'Enable'}
          </Button>
          <DeletePlaylistDialog playlist={playlist} onDeleted={onChanged} />
        </div>
      </div>
    </div>
  );
}

function ImportHistoryDialog({ playlistId }: { playlistId: string }) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useFetch<{ history: { id: string; status: string; imported: number; duplicates: number; errors: number; message: string | null; createdAt: string }[] }>(
    open ? `/api/playlists/${playlistId}/history` : null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><History className="h-3.5 w-3.5" /> History</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Import History</DialogTitle></DialogHeader>
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
          </div>
        ) : (data?.history ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No import runs yet.</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2 scroll-thin">
            {data?.history.map((h) => (
              <div key={h.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <Badge variant={h.status === 'success' ? 'default' : h.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {h.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Imported:</span> <span className="font-semibold">{h.imported}</span></div>
                  <div><span className="text-muted-foreground">Dupes:</span> <span className="font-semibold">{h.duplicates}</span></div>
                  <div><span className="text-muted-foreground">Errors:</span> <span className="font-semibold">{h.errors}</span></div>
                </div>
                {h.message && <p className="mt-1.5 text-xs text-muted-foreground">{h.message}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2.5 py-1.5">
      <p className={cn('text-base font-bold', accent)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function AddPlaylistDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    const res = await apiAction('POST', '/api/playlists', { name: name.trim(), url: url.trim(), importNow: true });
    setSaving(false);
    if (res.ok) {
      toast.success('Playlist added — importing in background');
      setName(''); setUrl('');
      onOpenChange(false);
      onAdded();
    } else {
      toast.error(res.error || 'Failed to add playlist');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Playlist</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add M3U Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pl-name">Playlist name</Label>
            <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sports Source 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-url">M3U URL</Label>
            <Input id="pl-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/playlist.m3u" />
            <p className="text-xs text-muted-foreground">Must be a public M3U / M3U8 playlist URL.</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving || !name.trim() || !url.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPlaylistDialog({ playlist, open, onOpenChange, onSaved }: { playlist: PlaylistDTO; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [name, setName] = useState(playlist.name);
  const [url, setUrl] = useState(playlist.url);
  const [hours, setHours] = useState(playlist.refreshHours);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const res = await apiAction('PATCH', `/api/playlists/${playlist.id}`, { name, url, refreshHours: hours });
    setSaving(false);
    if (res.ok) { toast.success('Playlist updated'); onOpenChange(false); onSaved(); }
    else toast.error(res.error || 'Failed');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Playlist</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Source URL (hidden for security)</Label>
            <Input value="••••••••••••••••••••••••" disabled className="bg-muted font-mono" />
            <p className="text-xs text-muted-foreground">Source URL is encrypted and never displayed.</p>
          </div>
          <div className="space-y-2">
            <Label>Auto-refresh interval (hours)</Label>
            <Input type="number" min={1} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePlaylistDialog({ playlist, onDeleted }: { playlist: PlaylistDTO; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function del() {
    setDeleting(true);
    const res = await apiAction('DELETE', `/api/playlists/${playlist.id}`);
    setDeleting(false);
    if (res.ok) { toast.success('Playlist deleted'); onDeleted(); }
    else toast.error(res.error || 'Failed');
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{playlist.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the playlist and all {playlist.channelCount} of its channels. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={del} disabled={deleting} className="bg-red-600 hover:bg-red-700">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
