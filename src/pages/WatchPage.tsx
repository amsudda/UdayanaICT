import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ClockIcon,
  FileTextIcon,
  FileXIcon,
  PlayIcon,
  PauseIcon,
  RadioIcon,
  RotateCcwIcon,
  RotateCwIcon,
  MaximizeIcon,
  MinimizeIcon,
  LayoutListIcon,
  SparklesIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeXIcon,
  Loader2Icon,
  LockIcon,
  ClipboardListIcon,
  BookOpenIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractYouTubeId } from '../lib/youtube';

type Tute = { name: string; url: string };
type VideoLesson = { id: string; title: string; youtubeId: string; duration: string; description?: string; tutes: Tute[]; kind?: 'lesson' | 'paper' };

const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

/* ── YouTube IFrame Player API ─────────────────── */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function YouTubePlayer({ videoId, onEnded, onPlayer, onState }: { videoId: string; onEnded: () => void; onPlayer?: (p: any) => void; onState?: (s: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onPlayerRef = useRef(onPlayer);
  onPlayerRef.current = onPlayer;
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  useEffect(() => {
    let cancelled = false;
    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    hostRef.current?.appendChild(mount);
    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player(mount, {
        width: '100%',
        height: '100%',
        videoId,
        // native UI fully off — the app draws its own controls
        playerVars: { rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, controls: 0, disablekb: 1, fs: 0 },
        events: {
          onReady: () => { readyRef.current = true; onPlayerRef.current?.(playerRef.current); },
          onStateChange: (e: any) => {
            onStateRef.current?.(e.data);
            if (window.YT && e.data === window.YT.PlayerState.ENDED) onEndedRef.current();
          }
        }
      });
    });
    return () => {
      cancelled = true;
      readyRef.current = false;
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (readyRef.current && playerRef.current?.loadVideoById) playerRef.current.loadVideoById(videoId);
  }, [videoId]);

  return <div ref={hostRef} className="w-full h-full" />;
}

/* ── custom player: blocks all YouTube UI, draws its own controls ── */
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2]; // YouTube's player caps at 2x

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h ? `${h}:` : ''}${h ? String(m).padStart(2, '0') : m}:${String(sec).padStart(2, '0')}`;
}

function CustomPlayer({ videoId, onEnded }: { videoId: string; onEnded: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const seekingRef = useRef(false);
  const lastSeekRef = useRef(0); // grace period so the poll doesn't snap the bar back mid-seek
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isFs, setIsFs] = useState(false);

  // poll playhead
  useEffect(() => {
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      try {
        if (!seekingRef.current && Date.now() - lastSeekRef.current > 1200) setCurrent(p.getCurrentTime() ?? 0);
        const d = p.getDuration?.() ?? 0;
        if (d) setDuration(d);
      } catch { /* ignore */ }
    }, 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  const handlePlayer = (p: any) => {
    playerRef.current = p;
    try {
      setVolume(Math.round(p.getVolume?.() ?? 100));
      setMuted(!!p.isMuted?.());
      p.setPlaybackRate?.(rate);
    } catch { /* ignore */ }
  };
  const handleState = (s: number) => {
    if (!window.YT) return;
    if (s === window.YT.PlayerState.PLAYING) setPlaying(true);
    else if (s === window.YT.PlayerState.PAUSED || s === window.YT.PlayerState.ENDED) setPlaying(false);
  };

  const toggle = () => {
    const p = playerRef.current;
    if (!p) return;
    try { if (playing) p.pauseVideo(); else p.playVideo(); } catch { /* ignore */ }
  };
  const seekBy = (d: number) => {
    const p = playerRef.current;
    if (!p?.seekTo) return;
    try {
      const t = Math.min(Math.max((p.getCurrentTime?.() ?? 0) + d, 0), duration || Number.MAX_SAFE_INTEGER);
      lastSeekRef.current = Date.now();
      p.seekTo(t, true);
      setCurrent(t);
    } catch { /* ignore */ }
  };
  const seekCommit = (v: number) => {
    seekingRef.current = false;
    lastSeekRef.current = Date.now();
    setCurrent(v);
    try { playerRef.current?.seekTo?.(v, true); } catch { /* ignore */ }
  };
  const changeRate = (r: number) => {
    setRate(r);
    setSpeedOpen(false);
    try { playerRef.current?.setPlaybackRate?.(r); } catch { /* ignore */ }
  };
  const changeVolume = (v: number) => {
    setVolume(v);
    const p = playerRef.current;
    if (!p) return;
    try {
      p.setVolume(v);
      if (v > 0 && p.isMuted?.()) { p.unMute(); setMuted(false); }
      if (v === 0) { p.mute(); setMuted(true); }
    } catch { /* ignore */ }
  };
  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (p.isMuted?.()) { p.unMute(); setMuted(false); }
      else { p.mute(); setMuted(true); }
    } catch { /* ignore */ }
  };
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  const ctlBtn = 'flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0';

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black select-none" onContextMenu={(e) => e.preventDefault()}>
      <YouTubePlayer videoId={videoId} onEnded={onEnded} onPlayer={handlePlayer} onState={handleState} />

      {/* interception layer — the YouTube iframe never receives clicks/hover */}
      <div
        className={`absolute inset-0 z-10 transition-colors ${playing ? '' : 'bg-black/95'}`}
        onClick={toggle}
        onDoubleClick={toggleFs}
      >
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-[#c20f24] shadow-[0_8px_30px_rgba(194,15,36,0.5)] hover:scale-105 transition-transform">
              <PlayIcon className="w-7 h-7 text-white fill-current ml-1" />
            </span>
          </div>
        )}
      </div>

      {/* custom control bar */}
      <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-2 pt-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={Math.min(current, Math.max(duration, 1))}
          onChange={(e) => { seekingRef.current = true; setCurrent(Number(e.target.value)); }}
          onMouseUp={(e) => seekCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => seekCommit(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => seekCommit(Number((e.target as HTMLInputElement).value))}
          aria-label="Seek"
          className="w-full h-1.5 accent-[#c20f24] cursor-pointer"
        />
        <div className="mt-1 flex items-center gap-1">
          <button type="button" className={ctlBtn} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
          </button>
          <button type="button" className={ctlBtn} onClick={() => seekBy(-10)} aria-label="Back 10 seconds" title="Back 10s">
            <RotateCcwIcon className="w-4 h-4" />
          </button>
          <button type="button" className={ctlBtn} onClick={() => seekBy(10)} aria-label="Forward 10 seconds" title="Forward 10s">
            <RotateCwIcon className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-white/60 tabular-nums px-1.5 shrink-0">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* speed */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSpeedOpen((o) => !o)}
              className="h-9 px-2.5 rounded-lg text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors tabular-nums"
              aria-label="Playback speed"
            >
              {rate}x
            </button>
            {speedOpen && (
              <div className="absolute bottom-11 right-0 bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl p-1 flex flex-col min-w-[72px] shadow-xl">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeRate(s)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-left tabular-nums ${s === rate ? 'bg-[#c20f24] text-white' : 'text-white/75 hover:bg-white/10'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* volume */}
          <button type="button" className={ctlBtn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? <VolumeXIcon className="w-4 h-4" /> : <Volume2Icon className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
            className="hidden sm:block w-20 accent-white cursor-pointer shrink-0"
          />

          {/* fullscreen */}
          <button type="button" className={ctlBtn} onClick={toggleFs} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFs ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── progress bar ── */
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-[5px] w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#3b82f6,#60a5fa,#93c5fd)' }}
        animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
    </div>
  );
}

function PlaylistItem({ lesson, index, isActive, isWatched, onClick }: {
  lesson: VideoLesson; index: number; isActive: boolean; isWatched: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`group/item w-full flex items-start gap-3 p-2.5 rounded-2xl text-left transition-all duration-150 ${
        isActive ? 'bg-red-500/15 ring-1 ring-red-400/40' : 'ring-1 ring-transparent hover:bg-white/[0.06]'}`}>
      <div className="relative w-[84px] h-[48px] rounded-xl shrink-0 overflow-hidden bg-white/5">
        {lesson.youtubeId ? (
          <img src={ytThumb(lesson.youtubeId)} alt="" loading="lazy"
            className={`w-full h-full object-cover transition ${isWatched && !isActive ? 'opacity-45' : 'opacity-90 group-hover/item:opacity-100'}`} />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-red-500/15 border border-red-500/25 transition ${isWatched && !isActive ? 'opacity-45' : 'opacity-90'}`}>
            <FileTextIcon className="w-5 h-5 text-red-300" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          {isActive ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#c20f24] shadow-lg"><PlayIcon className="w-3.5 h-3.5 text-white fill-current ml-0.5" /></span>
          ) : isWatched ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/90"><CheckIcon className="w-3.5 h-3.5 text-white" /></span>
          ) : (
            <span className="text-xs font-bold text-white/80">{index + 1}</span>
          )}
        </div>
        {isActive && <span className="absolute bottom-0 inset-x-0 text-center text-[8px] font-black text-white bg-[#c20f24]/90 uppercase tracking-wider leading-[11px]">{lesson.youtubeId ? 'Now Playing' : 'PDF'}</span>}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-[13px] font-semibold leading-snug line-clamp-2 ${isActive ? 'text-white' : isWatched ? 'text-white/45' : 'text-white/85'}`}>{lesson.title}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-white/45 mt-1 flex-wrap">
          {lesson.kind === 'paper' && <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">Paper</span>}
          <ClockIcon className="w-3 h-3 shrink-0" />{lesson.duration}
          {isWatched && !isActive && <span className="text-emerald-400/70 ml-1 font-medium">· Watched</span>}
        </p>
      </div>
    </button>
  );
}

export function WatchPage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const targetVideoId = params.get('v');

  const [title, setTitle] = useState('');
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [liveLinks, setLiveLinks] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [mobilePlaylistOpen, setMobilePlaylistOpen] = useState(false);


  const storageKey = `ict-watched-${packId}`;

  // load real data
  useEffect(() => {
    let active = true;
    (async () => {
      if (!packId) return;
      setLoading(true);
      let vids: any[] | null = null;
      let resolvedTitle = '';

      let live: any[] = [];
      let hws: any[] = [];
      const { data: pack } = await supabase.from('packs').select('title').eq('id', packId).maybeSingle();
      if (pack) {
        resolvedTitle = pack.title;
        const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', packId).order('sort_order');
        vids = data;
      } else {
        const { data: month } = await supabase.from('theory_months').select('month, year, topics').eq('id', packId).maybeSingle();
        if (month) {
          resolvedTitle = Array.isArray(month.topics) && month.topics.length > 0 ? month.topics.join(' · ') : `${month.month} ${month.year} — Recordings`;
          const [{ data }, { data: links }, { data: hw }] = await Promise.all([
            supabase.from('theory_videos').select('*').eq('theory_month_id', packId).order('sort_order'),
            supabase.from('theory_live_links').select('*').eq('theory_month_id', packId).order('sort_order'),
            supabase.from('theory_homework').select('*').eq('theory_month_id', packId).order('sort_order')
          ]);
          vids = data;
          live = links ?? [];
          hws = hw ?? [];
        }
      }
      if (!active) return;

      if (vids === null) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const mapped: VideoLesson[] = vids.map((v: any) => ({
        id: v.id, title: v.title, youtubeId: extractYouTubeId(v.youtube_id), duration: v.duration_label ?? '', description: v.description ?? '',
        kind: v.kind === 'paper' ? 'paper' : 'lesson',
        tutes: Array.isArray(v.tutes) && v.tutes.length ? v.tutes : v.tute_url ? [{ name: 'Tute PDF', url: v.tute_url }] : []
      }));
      let stored: string[] = [];
      try { stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); } catch { stored = []; }
      const watched = new Set(stored);
      setTitle(resolvedTitle);
      setLessons(mapped);
      setLiveLinks(live);
      setHomeworks(hws);
      setWatchedIds(watched);
      
      let initialIndex = Math.max(mapped.findIndex((l) => !watched.has(l.id)), 0);
      if (targetVideoId) {
        const found = mapped.findIndex(l => l.id === targetVideoId);
        if (found !== -1) initialIndex = found;
      }
      setActiveIndex(initialIndex);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [packId, storageKey]);

  // persist watched
  useEffect(() => {
    if (!packId || loading) return;
    localStorage.setItem(storageKey, JSON.stringify([...watchedIds]));
  }, [watchedIds, packId, storageKey, loading]);

  const active = lessons[activeIndex];
  const total = lessons.length;
  // count only lessons that still exist — stale localStorage ids must not inflate progress
  const watchedCount = lessons.filter((l) => watchedIds.has(l.id)).length;
  const progressPct = total > 0 ? Math.round((watchedCount / total) * 100) : 0;

  const markWatched = useCallback((id: string) => setWatchedIds((p) => (p.has(id) ? p : new Set([...p, id]))), []);
  const toggleWatched = useCallback((id: string) => setWatchedIds((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);
  const goTo = useCallback((i: number) => { if (i >= 0 && i < lessons.length) setActiveIndex(i); }, [lessons.length]);
  const handleNext = useCallback(() => { if (active) markWatched(active.id); goTo(activeIndex + 1); }, [active, activeIndex, goTo, markWatched]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
      else if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, goTo]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#0a0c11' }}>
        <Loader2Icon className="w-7 h-7 text-white/50 animate-spin" />
      </div>
    );
  }

  if (notFound || total === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#0a0c11' }}>
        <LockIcon className="w-8 h-8 text-white/30" />
        <p className="text-white/60 max-w-xs">
          {notFound ? 'This content was not found.' : 'No videos available here yet — or this month is locked until its fee is verified.'}
        </p>
        <button onClick={() => navigate(`/dashboard/courses/${packId}`)} className="text-red-400 text-sm font-semibold hover:underline">← Course Details</button>
      </div>
    );
  }

  const isActiveWatched = watchedIds.has(active.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #12161f 0%, #0a0c11 55%)' }}
    >
      <header className="flex items-center gap-3 px-4 sm:px-6 h-16 shrink-0 border-b border-white/[0.07] z-20"
        style={{ background: 'rgba(12,14,20,0.85)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => navigate(`/dashboard/courses/${packId}`)} className="group flex items-center gap-2.5 text-sm text-white/70 hover:text-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/8 group-hover:bg-white/15 border border-white/10 flex items-center justify-center"><ArrowLeftIcon className="w-4 h-4" /></div>
          <span className="hidden sm:inline font-medium">Course Details</span>
        </button>
        <div className="h-6 w-px bg-white/10 hidden sm:block" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-[11px] text-white/45 hidden sm:flex items-center gap-1.5 mt-0.5">Lesson {activeIndex + 1} of {total} · {active.duration}</p>
        </div>
        <div className="hidden lg:flex items-center gap-3 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-2 shrink-0">
          <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#3b82f6,#93c5fd)' }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
          </div>
          <span className="text-xs font-bold text-white/75">{progressPct}<span className="text-white/45 font-medium">%</span></span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="relative w-full bg-black shrink-0 lg:p-4 xl:p-5">
            {active.youtubeId ? (
              <div className="relative mx-auto overflow-hidden lg:rounded-2xl lg:shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-black" style={{ aspectRatio: '16/9', width: 'min(100%, calc(62vh * 16 / 9))' }}>
                <CustomPlayer videoId={active.youtubeId} onEnded={handleNext} />
              </div>
            ) : (
              <div className="relative mx-auto overflow-hidden lg:rounded-2xl lg:shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-gradient-to-br from-red-500/15 to-black flex flex-col items-center justify-center text-center px-6" style={{ aspectRatio: '16/9', width: 'min(100%, calc(62vh * 16 / 9))' }}>
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4">
                  <FileTextIcon className="w-8 h-8 text-red-300" />
                </div>
                <p className="text-lg font-bold text-white">PDF-only lesson</p>
                <p className="text-sm text-white/50 mt-1 max-w-sm">This lesson has no video — open the tute PDF below to read it.</p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
            <div className="px-4 sm:px-6 lg:px-5 pb-6 max-w-3xl space-y-5">
              <div className="pt-1">
                <div className="flex items-start gap-3 justify-between">
                  <h1 className="text-lg sm:text-2xl font-bold text-white leading-snug flex-1">{active.title}</h1>
                  <button type="button" onClick={() => toggleWatched(active.id)}
                    className={`shrink-0 mt-1 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                      isActiveWatched ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-white/70 bg-white/5 border-white/15 hover:border-white/35 hover:text-white'}`}>
                    <CheckCircleIcon className="w-3.5 h-3.5" />{isActiveWatched ? 'Watched' : 'Mark watched'}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-sm text-white/50 flex-wrap">
                  {active.kind === 'paper' && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-md px-2 py-0.5">Paper Discussion</span>
                  )}
                  <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" />{active.duration}</span>
                  <span className="text-white/25">·</span>
                  <span>Lesson {activeIndex + 1} of {total}</span>
                </div>
              </div>

              {/* monthly live classes — unlocked with the monthly fee */}
              {liveLinks.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-300 mb-3">
                    <RadioIcon className="w-4 h-4" /> Live Classes — this month
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {liveLinks.map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-[0_4px_16px_rgba(16,185,129,0.35)]"
                      >
                        <RadioIcon className="w-4 h-4" /> {l.label || 'Join Live Class'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* homework sheets — for theory months */}
              {homeworks.length > 0 && (
                <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.07] px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-indigo-300 mb-3">
                    <ClipboardListIcon className="w-4 h-4" /> Homework Sheets
                  </p>
                  <div className="flex flex-col gap-2">
                    {homeworks.map((hw) => (
                      <div key={hw.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                        <span className="text-sm font-semibold text-white/90">{hw.title || 'Homework'}</span>
                        <div className="flex items-center gap-2">
                          {hw.homework_url && (
                            <a href={hw.homework_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30 hover:text-indigo-200 transition-colors">
                              <BookOpenIcon className="w-3.5 h-3.5" /> Sheet
                            </a>
                          )}
                          {hw.scheme_url && (
                            <a href={hw.scheme_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 hover:text-emerald-200 transition-colors">
                              <CheckCircleIcon className="w-3.5 h-3.5" /> Scheme
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* lesson tute PDFs */}
              {active.tutes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {active.tutes.map((t, i) => (
                    <a
                      key={i}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-4 max-w-full rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:text-red-200 text-sm font-semibold transition-colors"
                    >
                      <FileTextIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-[220px]">{t.name || `Tute ${i + 1} (PDF)`}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-white/35">
                  <FileXIcon className="w-4 h-4" /> No tute PDF for this lesson
                </p>
              )}

              {active.description && <p className="text-sm text-white/60 leading-relaxed">{active.description}</p>}

              <div className="bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-white/60 font-medium">Progress</span>
                  <span className="font-bold text-red-400">{progressPct}%</span>
                </div>
                <ProgressBar pct={progressPct} />
                <p className="text-xs text-white/40">{watchedCount} of {total} watched</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:border-white/35 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed">
                  <ChevronLeftIcon className="w-4 h-4" /> Previous
                </button>
                <button onClick={handleNext} disabled={activeIndex === total - 1}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#c20f24] text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_4px_18px_rgba(194,15,36,0.4)]">
                  Next <SkipForwardIcon className="w-4 h-4" />
                </button>

              </div>

              {/* mobile playlist */}
              <div className="lg:hidden border border-white/[0.09] rounded-2xl overflow-hidden">
                <button type="button" onClick={() => setMobilePlaylistOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-4 bg-white/[0.05] hover:bg-white/[0.08] text-left">
                  <LayoutListIcon className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm font-semibold text-white/85 flex-1">All Lessons</span>
                  <span className="text-xs text-white/45 mr-1">{watchedCount}/{total} done</span>
                  <motion.div animate={{ rotate: mobilePlaylistOpen ? 180 : 0 }}><ChevronDownIcon className="w-4 h-4 text-white/45" /></motion.div>
                </button>
                <AnimatePresence>
                  {mobilePlaylistOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="p-2 border-t border-white/[0.07] max-h-[50vh] overflow-y-auto space-y-1">
                        {lessons.map((l, idx) => (
                          <PlaylistItem key={l.id} lesson={l} index={idx} isActive={idx === activeIndex} isWatched={watchedIds.has(l.id)} onClick={() => { goTo(idx); setMobilePlaylistOpen(false); }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* desktop playlist */}
        <motion.aside initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex w-[348px] xl:w-[380px] shrink-0 flex-col border-l border-white/[0.07]" style={{ background: 'linear-gradient(180deg,#13161d,#0e1117)' }}>
          <div className="px-4 py-5 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg border border-red-500/30 bg-red-500/15 flex items-center justify-center"><LayoutListIcon className="w-3.5 h-3.5 text-red-400" /></div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Playlist</p>
              <span className="ml-auto text-xs font-semibold text-white/45">{watchedCount}/{total}</span>
            </div>
            <p className="text-sm font-bold text-white leading-snug line-clamp-2 mb-4">{title}</p>
            <ProgressBar pct={progressPct} />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[11px] text-white/45">{progressPct}% complete</span>
              <AnimatePresence>
                {progressPct === 100 && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-[11px] font-bold text-yellow-300"><SparklesIcon className="w-3 h-3" /> Complete!</motion.span>}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.14) transparent' }}>
            <div className="space-y-1">
              {lessons.map((l, idx) => (
                <PlaylistItem key={l.id} lesson={l} index={idx} isActive={idx === activeIndex} isWatched={watchedIds.has(l.id)} onClick={() => goTo(idx)} />
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}
