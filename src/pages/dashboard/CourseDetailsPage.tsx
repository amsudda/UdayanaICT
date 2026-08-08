import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  FilmIcon,
  PlayIcon,
  RadioIcon,
  Loader2Icon,
  LockIcon,
  CheckIcon,
  ChevronRightIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { extractYouTubeId } from '../../lib/youtube';

type Tute = { name: string; url: string };
type VideoLesson = { id: string; title: string; youtubeId: string; duration: string; description?: string; tutes: Tute[]; kind?: 'lesson' | 'paper' };

const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

export function CourseDetailsPage() {
  const { packId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [liveLinks, setLiveLinks] = useState<any[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  const storageKey = `ict-watched-${packId}`;

  const load = useCallback(async () => {
    if (!packId) return;
    setLoading(true);
    let vids: any[] | null = null;
    let resolvedTitle = '';
    let resolvedDesc = '';
    let resolvedThumb = null;
    let live: any[] = [];

    const { data: pack } = await supabase.from('packs').select('*').eq('id', packId).maybeSingle();
    
    if (pack) {
      resolvedTitle = pack.title;
      resolvedDesc = pack.description ?? '';
      resolvedThumb = pack.thumbnail_url;
      const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', packId).order('sort_order');
      vids = data;
    } else {
      const { data: month } = await supabase.from('theory_months').select('*').eq('id', packId).maybeSingle();
      if (month) {
        resolvedTitle = `${month.month} ${month.year} — Recordings`;
        resolvedDesc = 'Monthly class recordings and materials.';
        resolvedThumb = month.thumbnail_url;
        const [{ data }, { data: links }] = await Promise.all([
          supabase.from('theory_videos').select('*').eq('theory_month_id', packId).order('sort_order'),
          supabase.from('theory_live_links').select('*').eq('theory_month_id', packId).order('sort_order')
        ]);
        vids = data;
        live = links ?? [];
      }
    }

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
    
    setTitle(resolvedTitle);
    setDescription(resolvedDesc);
    setThumbnail(resolvedThumb);
    setLessons(mapped);
    setLiveLinks(live);
    setWatchedIds(new Set(stored));
    setLoading(false);
  }, [packId, storageKey]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2Icon className="w-10 h-10 animate-spin text-[#c20f24]/40" />
        <p className="text-sm font-medium text-slate-400 mt-4 animate-pulse">Loading course details...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <LockIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Content Not Found</h2>
        <p className="text-slate-500 max-w-sm mb-8">This course is either unavailable or you do not have access to it.</p>
        <button onClick={() => navigate('/dashboard/courses')} className="h-12 px-8 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
          Back to My Classes
        </button>
      </div>
    );
  }

  const watchedCount = watchedIds.size;
  const progressPct = lessons.length > 0 ? Math.round((watchedCount / lessons.length) * 100) : 0;
  
  // Extract all unique tutes from all lessons
  const allTutes = lessons.flatMap(l => l.tutes).filter((t, i, arr) => arr.findIndex(x => x.url === t.url) === i);

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-12">
      
      {/* Immersive Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative rounded-[2rem] overflow-hidden mb-12 shadow-[0_20px_40px_rgba(0,0,0,0.06)] bg-[#0a0c11]"
      >
        
        {/* Motion Graphics Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated Tech Grid */}
          <motion.div 
            animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* SVG Abstract Motion Elements */}
          <svg className="absolute inset-0 w-full h-full opacity-100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="glowRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c20f24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff4747" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="glowBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Rotating Rings */}
            <motion.circle 
              cx="20%" cy="50%" r="180" 
              fill="none" stroke="url(#glowRed)" strokeWidth="4" strokeDasharray="15 30"
              animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              style={{ originX: '20%', originY: '50%' }}
            />
            <motion.circle 
              cx="80%" cy="30%" r="220" 
              fill="none" stroke="url(#glowBlue)" strokeWidth="3" strokeDasharray="10 25"
              animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              style={{ originX: '80%', originY: '30%' }}
            />

            {/* Floating Geometric Nodes & Lines */}
            <motion.g animate={{ y: [0, -30, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
              <line x1="30%" y1="20%" x2="50%" y2="60%" stroke="#c20f24" strokeWidth="2" opacity="0.8" />
              <circle cx="30%" cy="20%" r="8" fill="#c20f24" />
              <circle cx="50%" cy="60%" r="6" fill="#ff4747" />
            </motion.g>

            <motion.g animate={{ x: [0, 40, 0], y: [0, 25, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
              <line x1="70%" y1="80%" x2="90%" y2="50%" stroke="#3b82f6" strokeWidth="2" opacity="0.8" />
              <circle cx="70%" cy="80%" r="10" fill="#2563eb" />
              <circle cx="90%" cy="50%" r="7" fill="#60a5fa" />
            </motion.g>
          </svg>

          {/* Scanning Laser Line */}
          <motion.div 
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[4px] bg-[#c20f24] shadow-[0_0_25px_8px_rgba(194,15,36,0.8)] opacity-90"
          />

          {/* Slow Moving Gradients for Atmosphere */}
          <motion.div 
            animate={{ x: ['-20%', '20%', '-20%'], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-[20%] w-[50%] h-[100%] bg-[#c20f24] blur-[100px] rounded-full mix-blend-screen" 
          />
        </div>
        
        {/* Darkening Overlays so text is readable */}
        <div className="absolute inset-0 bg-[#0a0c11]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c11]/80 via-transparent to-transparent" />

        <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-12 min-h-[320px]">
          {/* Thumbnail */}
          <div className="w-full max-w-[280px] md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10 group">
            {thumbnail ? (
              <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <FilmIcon className="w-16 h-16 text-slate-600" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center md:text-left z-10">
            <button onClick={() => navigate('/dashboard/courses')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all mb-6">
              <ArrowLeftIcon className="w-3.5 h-3.5" /> MY CLASSES
            </button>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-sm">{title}</h1>
            {description && <p className="text-slate-300 text-sm md:text-base mb-8 max-w-2xl leading-relaxed font-medium">{description}</p>}
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 max-w-md bg-white/5 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-xs font-bold text-white/80 mb-2 uppercase tracking-wider">
                  <span>Progress</span>
                  <span className="text-[#ff3b3b]">{progressPct}%</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-[#c20f24] to-[#ff4747] rounded-full shadow-[0_0_10px_rgba(255,59,59,0.5)]" 
                  />
                </div>
              </div>
              <div className="shrink-0 text-right w-full sm:w-auto">
                <span className="text-3xl font-black text-white leading-none">{watchedCount}</span>
                <span className="text-white/40 font-bold ml-1">/ {lessons.length}</span>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-bold">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Layout */}
      <div className="space-y-12">
        
        {/* Horizontal Lessons Row */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
                 <FilmIcon className="w-5 h-5" />
               </div>
               Course Content
             </h2>
             <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold tracking-wide">
               {lessons.length} {lessons.length === 1 ? 'LESSON' : 'LESSONS'}
             </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {lessons.map((lesson, idx) => {
              const isWatched = watchedIds.has(lesson.id);
              return (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.5) }}
                  key={lesson.id}
                  onClick={() => navigate(`/dashboard/watch/${packId}?v=${lesson.id}`)}
                  className="w-full group text-left flex flex-col p-4 rounded-[1.5rem] bg-white border border-slate-100 hover:border-[#c20f24]/30 hover:shadow-[0_12px_30px_-10px_rgba(194,15,36,0.15)] transition-all duration-300"
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-100 mb-4 shadow-sm">
                    {lesson.youtubeId ? (
                      <img src={ytThumb(lesson.youtubeId)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-500/5 text-[#c20f24]">
                        <FileTextIcon className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    
                    {/* Dark Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300" />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 shadow-xl ring-1 ring-white/40">
                         <PlayIcon className="w-5 h-5 text-white fill-current ml-1" />
                      </div>
                    </div>
                    
                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded-md">
                      {lesson.duration}
                    </div>

                    {/* Watched Overlay */}
                    {isWatched && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm">
                        <CheckIcon className="w-3 h-3" /> WATCHED
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-[#c20f24] tracking-widest uppercase bg-red-50 px-2 py-0.5 rounded text-xs">
                        Lesson {idx + 1}
                      </span>
                      {lesson.kind === 'paper' && (
                        <span className="text-[10px] font-black text-amber-600 tracking-widest uppercase bg-amber-50 px-2 py-0.5 rounded text-xs">
                          Paper
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#c20f24] transition-colors line-clamp-2 leading-snug mb-3">
                      {lesson.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 mt-auto">
                      {lesson.tutes.length > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100 text-slate-600">
                           <FileTextIcon className="w-3.5 h-3.5 text-blue-500" /> 
                           {lesson.tutes.length} {lesson.tutes.length === 1 ? 'Material' : 'Materials'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Live Classes & Study Materials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {liveLinks.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
              {/* decorative circle */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              
              <h3 className="flex items-center gap-2.5 text-lg font-black text-emerald-900 mb-5 relative">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <RadioIcon className="w-4 h-4" />
                </div>
                Live Classes
              </h3>
              
              <div className="space-y-3 relative">
                {liveLinks.map(l => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.6)] group"
                  >
                    <RadioIcon className="w-5 h-5 shrink-0 opacity-80 group-hover:animate-pulse" />
                    <span className="truncate flex-1">{l.label || 'Join Live Class'}</span>
                    <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="flex items-center gap-2.5 text-lg font-black text-slate-900 mb-5">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileTextIcon className="w-4 h-4" />
              </div>
              Study Materials
            </h3>
            
            {allTutes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                 <FileTextIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                 <p className="text-sm font-semibold text-slate-500">No materials attached.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allTutes.map((t, idx) => (
                  <a
                    key={idx}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors shadow-sm">
                      <FileTextIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 truncate transition-colors">{t.name || `Study Material ${idx + 1}`}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">PDF Document</p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
      
      {/* Scrollbar styles to hide/make elegant */}
      {/* Scrollbar styles to hide/make elegant */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media (max-width: 640px) {
          .hide-scroll-on-mobile::-webkit-scrollbar { display: none; }
          .hide-scroll-on-mobile { -ms-overflow-style: none; scrollbar-width: none; }
        }
      `}</style>
    </div>
  );
}
