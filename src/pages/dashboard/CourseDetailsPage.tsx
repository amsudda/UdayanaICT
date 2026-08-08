import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  FilmIcon,
  PlayIcon,
  RadioIcon,
  Loader2Icon,
  LockIcon
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
    return <div className="py-24 flex justify-center"><Loader2Icon className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (notFound) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center px-4">
        <LockIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Content Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">This course is either unavailable or you do not have access to it.</p>
        <Link to="/dashboard/courses" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">← Back to My Classes</Link>
      </div>
    );
  }

  const watchedCount = watchedIds.size;
  const progressPct = lessons.length > 0 ? Math.round((watchedCount / lessons.length) * 100) : 0;
  
  // Extract all unique tutes from all lessons
  const allTutes = lessons.flatMap(l => l.tutes).filter((t, i, arr) => arr.findIndex(x => x.url === t.url) === i);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-5xl mx-auto space-y-8 pb-24 lg:pb-8">
      {/* Header / Hero */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        <div className="w-full md:w-1/3 aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200 dark:border-slate-800">
          {thumbnail ? (
            <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <FilmIcon className="w-12 h-12 mb-2 opacity-50" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <Link to="/dashboard/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-4">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Classes
          </Link>
          <h1 className="text-2xl md:text-4xl font-extrabold text-apple-text dark:text-apple-light mb-3 leading-tight">{title}</h1>
          {description && <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mb-6 leading-relaxed max-w-2xl">{description}</p>}
          
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-w-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Course Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#c20f24] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="block text-2xl font-black text-slate-900 dark:text-white">{watchedCount}<span className="text-slate-400 text-lg">/{lessons.length}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Lessons */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-apple-light flex items-center gap-2">
            <FilmIcon className="w-5 h-5 text-[#c20f24]" /> Course Content
          </h2>
          
          <div className="space-y-3">
            {lessons.map((lesson, idx) => {
              const isWatched = watchedIds.has(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => navigate(`/dashboard/watch/${packId}?v=${lesson.id}`)}
                  className="w-full text-left group flex items-start gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#c20f24]/50 hover:shadow-apple-hover transition-all"
                >
                  <div className="relative w-32 aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {lesson.youtubeId ? (
                      <img src={ytThumb(lesson.youtubeId)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-500/10 text-red-400">
                        <FileTextIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <PlayIcon className="w-8 h-8 text-white fill-current drop-shadow-md opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    </div>
                    {isWatched && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 py-1 pr-2">
                    <p className="text-xs font-semibold text-[#c20f24] mb-1 tracking-wide uppercase">Lesson {idx + 1}</p>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[#c20f24] transition-colors line-clamp-2 mb-1.5">{lesson.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {lesson.duration}</span>
                      {lesson.tutes.length > 0 && (
                        <span className="flex items-center gap-1"><FileTextIcon className="w-3.5 h-3.5" /> {lesson.tutes.length} {lesson.tutes.length === 1 ? 'Material' : 'Materials'}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Study Materials & Live Classes */}
        <div className="space-y-6">
          {liveLinks.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-500/[0.05] border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-5 md:p-6">
              <h3 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 mb-4">
                <RadioIcon className="w-5 h-5" /> Live Classes
              </h3>
              <div className="space-y-2.5">
                {liveLinks.map(l => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm"
                  >
                    <RadioIcon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{l.label || 'Join Live Class'}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-apple-light mb-4">
              <FileTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Study Materials
            </h3>
            
            {allTutes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No study materials attached to this course.</p>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {allTutes.map((t, idx) => (
                  <a
                    key={idx}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                      <FileTextIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate flex-1">{t.name || `Material ${idx + 1}`}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
