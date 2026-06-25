import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ClockIcon,
  PlayIcon,
  LayoutListIcon,
  SparklesIcon,
  SkipForwardIcon,
  Loader2Icon,
  LockIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type VideoLesson = { id: string; title: string; youtubeId: string; duration: string; description?: string };

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

function YouTubePlayer({ videoId, onEnded }: { videoId: string; onEnded: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

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
        playerVars: { rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1 },
        events: {
          onReady: () => { readyRef.current = true; },
          onStateChange: (e: any) => {
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
        <img src={ytThumb(lesson.youtubeId)} alt="" loading="lazy"
          className={`w-full h-full object-cover transition ${isWatched && !isActive ? 'opacity-45' : 'opacity-90 group-hover/item:opacity-100'}`} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          {isActive ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#c20f24] shadow-lg"><PlayIcon className="w-3.5 h-3.5 text-white fill-current ml-0.5" /></span>
          ) : isWatched ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/90"><CheckIcon className="w-3.5 h-3.5 text-white" /></span>
          ) : (
            <span className="text-xs font-bold text-white/80">{index + 1}</span>
          )}
        </div>
        {isActive && <span className="absolute bottom-0 inset-x-0 text-center text-[8px] font-black text-white bg-[#c20f24]/90 uppercase tracking-wider leading-[11px]">Now Playing</span>}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-[13px] font-semibold leading-snug line-clamp-2 ${isActive ? 'text-white' : isWatched ? 'text-white/45' : 'text-white/85'}`}>{lesson.title}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-white/45 mt-1">
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

  const [title, setTitle] = useState('');
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
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

      const { data: pack } = await supabase.from('packs').select('title').eq('id', packId).maybeSingle();
      if (pack) {
        resolvedTitle = pack.title;
        const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', packId).order('sort_order');
        vids = data;
      } else {
        const { data: month } = await supabase.from('theory_months').select('month, year').eq('id', packId).maybeSingle();
        if (month) {
          resolvedTitle = `${month.month} ${month.year} — Recordings`;
          const { data } = await supabase.from('theory_videos').select('*').eq('theory_month_id', packId).order('sort_order');
          vids = data;
        }
      }
      if (!active) return;

      if (vids === null) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const mapped: VideoLesson[] = vids.map((v: any) => ({
        id: v.id, title: v.title, youtubeId: v.youtube_id, duration: v.duration_label ?? '', description: v.description ?? ''
      }));
      let stored: string[] = [];
      try { stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); } catch { stored = []; }
      const watched = new Set(stored);
      setTitle(resolvedTitle);
      setLessons(mapped);
      setWatchedIds(watched);
      const firstUnwatched = mapped.findIndex((l) => !watched.has(l.id));
      setActiveIndex(Math.max(firstUnwatched, 0));
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
  const watchedCount = watchedIds.size;
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
        <button onClick={() => navigate('/dashboard/courses')} className="text-red-400 text-sm font-semibold hover:underline">← My Classes</button>
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
        <button onClick={() => navigate('/dashboard/courses')} className="group flex items-center gap-2.5 text-sm text-white/70 hover:text-white shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/8 group-hover:bg-white/15 border border-white/10 flex items-center justify-center"><ArrowLeftIcon className="w-4 h-4" /></div>
          <span className="hidden sm:inline font-medium">My Classes</span>
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
            <div className="relative w-full mx-auto overflow-hidden lg:rounded-2xl lg:shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-black" style={{ aspectRatio: '16/9', maxHeight: 'min(62vh, 100%)' }}>
              <YouTubePlayer videoId={active.youtubeId} onEnded={handleNext} />
            </div>
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
                  <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" />{active.duration}</span>
                  <span className="text-white/25">·</span>
                  <span>Lesson {activeIndex + 1} of {total}</span>
                </div>
              </div>

              {active.description && <p className="text-sm text-white/60 leading-relaxed">{active.description}</p>}

              <div className="bg-white/[0.05] border border-white/[0.09] rounded-2xl px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-white/60 font-medium">Progress</span>
                  <span className="font-bold text-red-400">{progressPct}%</span>
                </div>
                <ProgressBar pct={progressPct} />
                <p className="text-xs text-white/40">{watchedCount} of {total} watched</p>
              </div>

              <div className="flex items-center gap-3">
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
