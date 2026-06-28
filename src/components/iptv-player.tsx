'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  X, Minimize2, Maximize2, Maximize, Minimize, Heart, Radio, Bell,
  Loader2, AlertTriangle, Volume2, VolumeX, Volume1, Settings, Tv,
  Play, Pause, SkipBack, SkipForward, Gauge, RotateCcw, ChevronLeft, ChevronRight, Shield,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { apiAction } from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChannelDTO } from '@/lib/types';

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function IptvPlayer() {
  const { playerOpen, playerChannel, playerMinimized, closePlayer, minimizePlayer } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [unblockerActive, setUnblockerActive] = useState(false);
  const [fav, setFav] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // sync favorite + subscription state with current channel
  useEffect(() => {
    setFav(playerChannel?.isFavorite ?? false);
    setSubscribed(playerChannel?.isSubscribed ?? false);
  }, [playerChannel]);

  // load the stream whenever the channel changes
  const loadStream = useCallback(() => {
    const video = videoRef.current;
    const channel = playerChannel;
    if (!video || !channel) return;

    setLoading(true);
    setError(null);
    setLevels([]);
    setCurrentLevel(-1);
    setCurrentTime(0);
    setDuration(0);

    // cleanup previous hls
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3u8 = /\.m3u8(\?|$)/i.test(channel.url) || channel.url.includes('m3u8');

    // Geo-unblocker: proxy rewrites HLS manifests so ALL segment requests
    // also go through the server (bypassing geo-blocks on segment level).
    const proxyUrl = `/api/proxy/stream?url=${encodeURIComponent(channel.url)}`;
    let triedProxy = false;
    setUnblockerActive(false);

    // Strategy: ALWAYS use proxy first — the proxy rewrites HLS manifests so
    // ALL segment requests go through the server, bypassing geo-blocks + CORS.
    // This is more reliable than direct playback which fails on geo-blocked streams.
    const useProxyFirst = true;

    const onReady = () => {
      setLoading(false);
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      hlsRef.current = hls;
      // If channel is not verified online, use proxy first (with manifest rewriting)
      const initialUrl = useProxyFirst ? proxyUrl : channel.url;
      if (useProxyFirst) setUnblockerActive(true);
      hls.loadSource(initialUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLevels(
          data.levels
            .map((l, i) => ({ height: l.height || 0, index: i }))
            .sort((a, b) => b.height - a.height),
        );
        setCurrentLevel(-1);
        onReady();
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          // Geo-unblocker: if direct stream fails with network error, try proxy
          if (!triedProxy && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            triedProxy = true;
            setUnblockerActive(true);
            hls.destroy();
            const proxyHls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsRef.current = proxyHls;
            proxyHls.loadSource(proxyUrl);
            proxyHls.attachMedia(video);
            proxyHls.on(Hls.Events.MANIFEST_PARSED, () => onReady());
            proxyHls.on(Hls.Events.ERROR, (_e2, data2) => {
              if (data2.fatal) {
                setLoading(false);
                setError(
                  data2.type === Hls.ErrorTypes.NETWORK_ERROR
                    ? 'Stream is geo-blocked or offline. Try Next Channel to find a working stream.'
                    : 'Stream failed to load. Try Next Channel.',
                );
              }
            });
            return;
          }
          setLoading(false);
          setError(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? 'Stream is geo-blocked or offline. Try Next Channel to find a working stream.'
              : data.type === Hls.ErrorTypes.MEDIA_ERROR
                ? 'Media error — this stream format is not playable. Try Next Channel.'
                : 'Stream failed to load. Try Next Channel.',
          );
        }
      });
    } else {
      // native playback (Safari / direct mp4 / plain HLS)
      // Try direct first, fall back to proxy on error
      video.src = channel.url;
      video.addEventListener('loadedmetadata', onReady, { once: true });
      video.addEventListener('error', () => {
        if (!triedProxy) {
          triedProxy = true;
          video.src = proxyUrl;
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.addEventListener('error', () => {
            setLoading(false);
            setError('Stream is geo-blocked or offline. Try Next Channel to find a working stream.');
          }, { once: true });
        } else {
          setLoading(false);
          setError('Stream is geo-blocked or offline. Try Next Channel to find a working stream.');
        }
      }, { once: true });
    }

    // record view + history
    apiAction('PATCH', `/api/channels/${channel.id}`, { incrementView: true });
    apiAction('POST', '/api/history', { channelId: channel.id, position: 0, duration: 0 });
  }, [playerChannel]);

  useEffect(() => {
    if (playerOpen && playerChannel) loadStream();
  }, [playerOpen, playerChannel?.id, retryKey]);

  // attach video event listeners for state sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playerOpen) return;

    function onTimeUpdate() { setCurrentTime(video.currentTime); }
    function onDurationChange() { setDuration(video.duration || 0); }
    function onProgress() {
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    }
    function onPlay() { setPlaying(true); }
    function onPause() { setPlaying(false); }
    function onVolumeChange() { setMuted(video.muted); setVolume(video.volume); }
    function onRateChange() { setSpeed(video.playbackRate); }
    function onPipEnter() { setIsPip(true); }
    function onPipLeave() { setIsPip(false); }

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('enterpictureinpicture', onPipEnter);
    video.addEventListener('leavepictureinpicture', onPipLeave);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('enterpictureinpicture', onPipEnter);
      video.removeEventListener('leavepictureinpicture', onPipLeave);
    };
  }, [playerOpen, loading]);

  // periodic position save (resume playback)
  useEffect(() => {
    if (!playerOpen) return;
    saveTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      const channel = playerChannel;
      if (video && channel && !video.paused) {
        apiAction('POST', '/api/history', {
          channelId: channel.id,
          position: video.currentTime,
          duration: video.duration || 0,
        });
      }
    }, 10000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [playerOpen, playerChannel]);

  // cleanup on close
  useEffect(() => {
    if (!playerOpen) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      const video = videoRef.current;
      if (video) video.removeAttribute('src');
    }
  }, [playerOpen]);

  // fullscreen tracking
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    hideControlsRef.current = setTimeout(() => {
      if (playing && !showSettings) setShowControls(false);
    }, 3500);
  }, [playing, showSettings]);

  // Channel list for prev/next navigation (must be before early return).
  const [channelList, setChannelList] = useState<ChannelDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (!playerChannel) return;
    const params = new URLSearchParams({ limit: '100', sort: 'viewCount' });
    if (playerChannel.category) params.set('category', playerChannel.category);
    fetch(`/api/channels?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { channels: ChannelDTO[] }) => {
        setChannelList(data.channels || []);
        const idx = (data.channels || []).findIndex((c) => c.id === playerChannel.id);
        setCurrentIndex(idx);
      })
      .catch(() => {});
  }, [playerChannel]);

  if (!playerOpen || !playerChannel) return null;

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  }

  function onSeek(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  }

  function onVolumeSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const v = Number(e.target.value);
    video.volume = v;
    video.muted = v === 0;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen().catch(() => {});
  }

  async function togglePip() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      toast.error('Picture-in-Picture not available');
    }
  }

  function changeLevel(index: number) {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
    }
    setShowSettings(false);
  }

  function changeSpeed(s: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  }

  async function toggleFav() {
    if (!playerChannel) return;
    const next = !fav;
    setFav(next);
    const res = await apiAction(
      next ? 'POST' : 'DELETE',
      next ? '/api/favorites' : `/api/favorites/${playerChannel.id}`,
      next ? { channelId: playerChannel.id } : undefined,
    );
    if (!res.ok) {
      setFav(!next);
      toast.error(res.error || 'Failed');
    } else {
      toast.success(next ? 'Added to favorites' : 'Removed from favorites');
    }
  }

  async function toggleNotify() {
    if (!playerChannel) return;
    const authUser = useApp.getState().authUser;
    if (!authUser) {
      useApp.getState().openAuth('signup');
      return;
    }
    const next = !subscribed;
    setSubscribed(next);
    const res = await apiAction('POST', `/api/channels/${playerChannel.id}/notify`);
    if (res.ok) {
      toast.success(next ? `You'll be notified when ${playerChannel.displayName} goes live` : 'Notifications disabled');
    } else {
      setSubscribed(!next);
      toast.error(res.error || 'Failed');
    }
  }

  /** Play the next channel in the category list. */
  function playNext() {
    if (channelList.length === 0) return;
    const nextIdx = currentIndex + 1 >= channelList.length ? 0 : currentIndex + 1;
    const next = channelList[nextIdx];
    if (next) {
      setCurrentIndex(nextIdx);
      useApp.getState().openPlayer(next);
    }
  }

  /** Play the previous channel in the category list. */
  function playPrev() {
    if (channelList.length === 0) return;
    const prevIdx = currentIndex - 1 < 0 ? channelList.length - 1 : currentIndex - 1;
    const prev = channelList[prevIdx];
    if (prev) {
      setCurrentIndex(prevIdx);
      useApp.getState().openPlayer(prev);
    }
  }

  /** Find the next working channel in the same category and play it. */
  async function tryNextChannel() {
    if (!playerChannel) return;
    setLoading(true);
    setError(null);
    // Use the prev/next list if available, otherwise fetch working channels.
    if (channelList.length > 0) {
      playNext();
      return;
    }
    try {
      const params = new URLSearchParams({ working: 'true', limit: '20', sort: 'viewCount' });
      if (playerChannel.category) params.set('category', playerChannel.category);
      const res = await fetch(`/api/channels?${params.toString()}`);
      const data = await res.json();
      const channels: ChannelDTO[] = data.channels || [];
      const candidates = channels.filter((c) => c.id !== playerChannel.id);
      if (candidates.length === 0) {
        setLoading(false);
        setError('No working channels found in this category. Try a different category.');
        return;
      }
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      toast.success(`Switching to: ${next.displayName}`);
      useApp.getState().openPlayer(next);
    } catch {
      setLoading(false);
      setError('Could not find a working channel. Please try again later.');
    }
  }

  const channel = playerChannel;
  const liveStream = !isFinite(duration) || duration === 0;
  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur transition-all',
        playerMinimized && 'pointer-events-none',
      )}
    >
      {/* hidden when minimized */}
      <div className={cn('flex h-full flex-col', playerMinimized && 'hidden')}>
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {channel.logo && (
               
              <img src={channel.logo} alt="" className="h-8 w-8 rounded object-contain" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-white sm:text-base">{channel.displayName}</h3>
                {channel.liveNow && (
                  <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <Radio className="h-2.5 w-2.5 live-dot" /> LIVE
                  </span>
                )}
                {unblockerActive && (
                  <span className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <Shield className="h-2.5 w-2.5" /> UNBLOCKED
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-white/60">
                {channel.subcategory ? `${channel.subcategory} · ` : ''}
                {channel.category} · {channel.sourceName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleNotify} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Notify when live">
              <Bell className={cn('h-4 w-4', subscribed && 'fill-amber-500 text-amber-500')} />
            </button>
            <button onClick={toggleFav} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Favorite">
              <Heart className={cn('h-4 w-4', fav && 'fill-red-500 text-red-500')} />
            </button>
            <button onClick={() => minimizePlayer(true)} className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 sm:flex" aria-label="Minimize">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={closePlayer} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* video + controls */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-black"
          onMouseMove={showControlsTemporarily}
          onMouseLeave={() => playing && !showSettings && setShowControls(false)}
          onClick={(e) => {
            // click on video area toggles play (but not on controls)
            if ((e.target as HTMLElement).tagName === 'VIDEO') togglePlay();
          }}
        >
          <video
            ref={videoRef}
            className="h-full w-full"
            playsInline
            autoPlay
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
          />

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="h-10 w-10 animate-spin text-brand" />
              <p className="text-sm text-white/70">Loading stream…</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-400" />
              <div>
                <p className="text-base font-semibold text-white">Playback failed</p>
                <p className="mt-1 max-w-md text-sm text-white/60">{error}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setRetryKey((k) => k + 1)} className="rounded-lg brand-bg px-4 py-2 text-sm font-semibold">Retry</button>
                <button onClick={tryNextChannel} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Try Next Channel →
                </button>
                <button onClick={closePlayer} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Close</button>
              </div>
              <p className="mt-2 max-w-md text-xs text-white/40">
                This stream is geo-blocked or offline. Click <strong>Try Next Channel</strong> to automatically find a working stream in the same category.
              </p>
            </div>
          )}

          {/* center play/pause overlay (when paused) */}
          {!loading && !error && !playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
              aria-label="Play"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full brand-bg shadow-2xl">
                <Play className="h-7 w-7 fill-current" />
              </div>
            </button>
          )}

          {/* custom control bar — always visible when not loading */}
          {!loading && (
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300',
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
                error && 'opacity-60',
              )}
            >
              {/* seek bar */}
              <div
                className="group/seek relative mb-2 h-1.5 cursor-pointer rounded-full bg-white/20"
                onClick={onSeek}
              >
                {/* buffered */}
                <div className="absolute h-full rounded-full bg-white/30" style={{ width: `${bufferPct}%` }} />
                {/* played */}
                <div className="absolute h-full rounded-full brand-bg" style={{ width: `${seekPct}%` }} />
                {/* scrubber dot */}
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/seek:opacity-100"
                  style={{ left: `calc(${seekPct}% - 6px)` }}
                />
              </div>

              {/* buttons row */}
              <div className="flex items-center gap-2 text-white">
                {/* prev channel */}
                <button onClick={playPrev} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Previous channel" title="Previous channel">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* play/pause */}
                <button onClick={togglePlay} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                {/* next channel */}
                <button onClick={playNext} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Next channel" title="Next channel">
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* skip back 10s */}
                {!liveStream && (
                  <button onClick={() => seekBy(-10)} className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" aria-label="Back 10s">
                    <SkipBack className="h-4 w-4" />
                  </button>
                )}
                {!liveStream && (
                  <button onClick={() => seekBy(10)} className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" aria-label="Forward 10s">
                    <SkipForward className="h-4 w-4" />
                  </button>
                )}
                {/* restart (live) */}
                {liveStream && (
                  <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = v.buffered.length > 0 ? Math.max(0, v.buffered.end(v.buffered.length - 1) - 5) : 0; }} className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" aria-label="Jump to live">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {/* volume */}
                <div className="flex items-center gap-1.5">
                  <button onClick={toggleMute} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Mute">
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={onVolumeSlider}
                    className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 sm:w-20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    aria-label="Volume"
                  />
                </div>

                {/* time */}
                <div className="ml-1 text-xs font-medium tabular-nums text-white/80">
                  {liveStream ? (
                    <span className="flex items-center gap-1 text-red-500"><Radio className="h-3 w-3 live-dot" /> LIVE</span>
                  ) : (
                    <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  )}
                </div>

                <div className="ml-auto flex items-center gap-1">
                  {/* settings (quality + speed) */}
                  <div className="relative">
                    <button onClick={() => setShowSettings((s) => !s)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Settings">
                      <Settings className={cn('h-4 w-4', showSettings && 'text-brand')} />
                    </button>
                    {showSettings && (
                      <div className="absolute bottom-11 right-0 w-48 rounded-lg border border-white/10 bg-black/95 p-2 text-sm text-white shadow-xl">
                        {/* quality */}
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">Quality</p>
                        <button onClick={() => changeLevel(-1)} className={cn('flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-white/10', currentLevel === -1 && 'text-brand')}>
                          <span>Auto</span>
                          {levels.length > 0 && <span className="text-[10px] text-white/40">{levels.length} levels</span>}
                        </button>
                        {levels.map((l) => (
                          <button key={l.index} onClick={() => changeLevel(l.index)} className={cn('flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-white/10', currentLevel === l.index && 'text-brand')}>
                            {l.height ? `${l.height}p` : `Track ${l.index + 1}`}
                          </button>
                        ))}
                        {levels.length === 0 && <p className="px-2 py-1 text-[10px] text-white/40">Single quality</p>}

                        <div className="my-1.5 border-t border-white/10" />

                        {/* speed */}
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/40">Playback Speed</p>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button key={s} onClick={() => changeSpeed(s)} className={cn('flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-white/10', speed === s && 'text-brand')}>
                            <span className="flex items-center gap-1.5"><Gauge className="h-3 w-3" /> {s}x</span>
                            {speed === s && <span className="text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PiP */}
                  <button onClick={togglePip} className={cn('flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10', isPip && 'text-brand')} aria-label="Picture in picture">
                    <Minimize className="h-4 w-4" />
                  </button>

                  {/* fullscreen */}
                  <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Fullscreen">
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* bottom info */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-1">
              <Tv className="h-3 w-3" /> {channel.sourceName}
            </span>
            {channel.country && <span className="rounded bg-white/10 px-2 py-1">{channel.country}</span>}
            {channel.language && <span className="rounded bg-white/10 px-2 py-1">{channel.language}</span>}
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-400 capitalize">{channel.status}</span>
            <span className="ml-auto hidden text-[10px] text-white/30 sm:block">Stream ID: {channel.id.slice(-8)}</span>
          </div>
        </div>
      </div>

      {/* minimized mini player */}
      {playerMinimized && (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
          <div className="relative aspect-video bg-black">
            {channel.logo ? (
               
              <img src={channel.logo} alt="" className="h-full w-full object-contain p-4" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/40">
                <Tv className="h-8 w-8" />
              </div>
            )}
            <button onClick={() => minimizePlayer(false)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={closePlayer} className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-2">
            <p className="truncate text-xs font-semibold text-white">{channel.displayName}</p>
            <p className="truncate text-[10px] text-white/50">{channel.category}</p>
          </div>
        </div>
      )}
    </div>
  );
}
