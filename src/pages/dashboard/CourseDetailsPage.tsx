import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  FilmIcon,
  PlayIcon,
  RadioIcon,
  LockIcon,
  CheckIcon,
  ChevronRightIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { extractYouTubeId } from '../../lib/youtube';
import { VIDEO_KINDS, toVideoKind, videoKindLabel, type VideoKind } from '../../data/videoCategories';
import { ClassMaterials } from '../../components/shared/ClassMaterials';
import { LogoLoader } from '../../components/shared/LogoLoader';
import { CourseHero } from '../../components/dashboard/CourseHero';

type Tute = { name: string; url: string };
type VideoLesson = { id: string; title: string; youtubeId: string; duration: string; description?: string; tutes: Tute[]; kind: VideoKind };

const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

// section-heading accent and card-badge colour per category
const kindAccent: Record<VideoKind, string> = {
  lesson: 'bg-[#c20f24]',
  question_book: 'bg-sky-500',
  paper: 'bg-amber-500'
};
const kindBadge: Record<VideoKind, string> = {
  lesson: 'text-[#c20f24] bg-red-50',
  question_book: 'text-sky-700 bg-sky-50',
  paper: 'text-amber-600 bg-amber-50'
};

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
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
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
        resolvedTitle = Array.isArray(month.topics) && month.topics.length > 0 ? month.topics.join(' · ') : `${month.month} ${month.year} — Recordings`;
        resolvedDesc = 'Monthly class recordings and materials.';
        resolvedThumb = month.thumbnail_url;
        const [{ data }, { data: links }, { data: hw }, { data: pp }] = await Promise.all([
          supabase.from('theory_videos').select('*').eq('theory_month_id', packId).order('sort_order'),
          supabase.from('theory_live_links').select('*').eq('theory_month_id', packId).order('sort_order'),
          supabase.from('theory_homework').select('*').eq('theory_month_id', packId).order('sort_order'),
          supabase.from('theory_papers').select('*').eq('theory_month_id', packId).order('sort_order')
        ]);
        vids = data;
        live = links ?? [];
        setHomeworks(hw ?? []);
        setPapers(pp ?? []);
      }
    }

    if (vids === null) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const mapped: VideoLesson[] = vids.map((v: any) => ({
      id: v.id, title: v.title, youtubeId: extractYouTubeId(v.youtube_id), duration: v.duration_label ?? '', description: v.description ?? '',
      kind: toVideoKind(v.kind),
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
      <LogoLoader variant="inline" label="Loading course..." className="min-h-[60vh]" />
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

  // Extract all unique tutes from all lessons
  const allTutes = lessons.flatMap(l => l.tutes).filter((t, i, arr) => arr.findIndex(x => x.url === t.url) === i);

  // Group videos into their admin-assigned categories, in VIDEO_KINDS order.
  // The "Day" badge keeps each video's position in the full list, so the
  // class chronology survives the regrouping.
  const dayOf = new Map(lessons.map((l, i) => [l.id, i + 1]));
  const sections = VIDEO_KINDS
    .map((k) => ({ ...k, items: lessons.filter((l) => l.kind === k.key) }))
    .filter((sec) => sec.items.length > 0);
  // With only one category present — every pack, and any month not yet
  // categorised — a heading would just restate the obvious, or mislabel a
  // paper pack as "Lesson" since pack videos carry no category. Headings
  // appear once there is something to tell apart.
  const showSectionHeadings = sections.length > 1;

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-12">

      <CourseHero
        title={title}
        description={description}
        thumbnail={thumbnail}
        watchedCount={watchedCount}
        total={lessons.length}
        onBack={() => navigate('/dashboard/courses')}
      />

      {/* Layout */}
      <div className="space-y-12">

        {/* Compact Blue Live Classes */}
        {liveLinks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10 shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <RadioIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-none">Live Classes</h2>
                <p className="text-xs font-semibold text-blue-600 mt-1 uppercase tracking-widest">Available via Zoom</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 relative z-10 w-full md:w-auto md:justify-end">
              {liveLinks.map(l => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm group"
                >
                  <span className="truncate max-w-[200px]">{l.label || 'Join Live Class'}</span>
                  <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

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

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.key}>
                {showSectionHeadings && (
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/70">
                    <h3 className="flex items-center gap-2.5 text-lg font-black text-slate-900 tracking-tight">
                      <span className={`w-1.5 h-5 rounded-full ${kindAccent[section.key]}`} aria-hidden="true" />
                      {section.label}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 tracking-wide">
                      {section.items.length} {section.items.length === 1 ? 'VIDEO' : 'VIDEOS'}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {section.items.map((lesson, pos) => {
                    const isWatched = watchedIds.has(lesson.id);
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: Math.min(pos * 0.05, 0.5) }}
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
                              Day {dayOf.get(lesson.id)}
                            </span>
                            {!showSectionHeadings && lesson.kind !== 'lesson' && (
                              <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded text-xs ${kindBadge[lesson.kind]}`}>
                                {videoKindLabel(lesson.kind, 'short')}
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
              </section>
            ))}
          </div>
        </div>

        {/* Class materials — paper class papers, homework sheets and tute notes */}
        <ClassMaterials papers={papers} homeworks={homeworks} notes={allTutes} />
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
