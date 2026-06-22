import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SearchIcon, CalendarClockIcon, InfinityIcon, PlayCircleIcon } from 'lucide-react';
import { VideoPackCard } from '../components/shared/VideoPackCard';
import { BuyPackModal } from '../components/shared/BuyPackModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

/* eslint-disable @typescript-eslint/no-explicit-any */

type StorePack = {
  id: string;
  title: string;
  type: string;
  price: number;
  thumbnailUrl?: string;
  duration: string;
  videoCount: number;
};

const DEFAULT_TERM_START = new Date(`${new Date().getFullYear()}-01-01`);
const DEFAULT_EXAM = new Date(`${new Date().getFullYear() + 1}-08-10`);

const categories = ['All', 'Paper Classes', 'Theory', 'Revision'] as const;
const categoryDesc: Record<string, string> = {
  All: 'Every video pack available to you right now',
  'Paper Classes': 'Full past-paper discussion sessions',
  Theory: 'In-depth theory and concept classes',
  Revision: 'Focused, intensive revision packs'
};

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function ExtraClassesPage() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [buyingPack, setBuyingPack] = useState<StorePack | null>(null);

  const [packs, setPacks] = useState<StorePack[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [examDate, setExamDate] = useState<Date>(DEFAULT_EXAM);
  const [termStart, setTermStart] = useState<Date>(DEFAULT_TERM_START);
  const examLabel = `${user?.program ?? 'A/L'}${user?.examYear ? ` ${user.examYear}` : ''}`;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ps } = await supabase.from('packs').select('*').eq('is_published', true).order('created_at', { ascending: false });
    const list = ps ?? [];
    const ids = list.map((p: any) => p.id);

    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: pv } = await supabase.from('pack_videos').select('pack_id').in('pack_id', ids);
      counts = (pv ?? []).reduce<Record<string, number>>((a, r: any) => { a[r.pack_id] = (a[r.pack_id] ?? 0) + 1; return a; }, {});
    }

    const [{ data: enr }, { data: pend }] = await Promise.all([
      supabase.from('enrollments').select('pack_id').not('pack_id', 'is', null),
      supabase.from('payments').select('pack_id').eq('kind', 'pack').eq('status', 'pending')
    ]);

    setOwned(new Set((enr ?? []).map((e: any) => e.pack_id)));
    setPending(new Set((pend ?? []).map((p: any) => p.pack_id).filter(Boolean)));
    setPacks(list.map((p: any) => ({
      id: p.id, title: p.title, type: p.type ?? '', price: Number(p.price ?? 0),
      thumbnailUrl: p.thumbnail_url ?? undefined, duration: p.duration_label ?? '',
      videoCount: counts[p.id] ?? 0
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (!data) return;
      const d = user?.program === 'O/L' ? data.ol_exam_date : data.al_exam_date;
      if (d) setExamDate(new Date(d));
      if (data.term_start_date) setTermStart(new Date(data.term_start_date));
    });
  }, [user?.program]);

  const statusFor = (id: string): 'none' | 'pending' | 'owned' =>
    owned.has(id) ? 'owned' : pending.has(id) ? 'pending' : 'none';

  const countFor = (cat: string) =>
    cat === 'All' ? packs.length : packs.filter((c) => c.type === cat).length;

  const filtered = packs.filter((c) => {
    const matchCat = activeCategory === 'All' || c.type === activeCategory;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const now = new Date();
  const daysLeft = daysBetween(now, examDate);
  const windowDays = Math.max(daysBetween(termStart, examDate), 1);
  const elapsedPct = Math.min(Math.max(((windowDays - daysLeft) / windowDays) * 100, 0), 100);
  const totalVideos = packs.reduce((s, c) => s + c.videoCount, 0);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.06 } } };
  const itemV = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-24 lg:pb-0">
      {/* countdown */}
      <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-[0_10px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#f59e0b,#f97316,#f59e0b)]" />
        <div className="p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-5 sm:flex-1">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <CalendarClockIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">{examLabel} exam</p>
              {daysLeft > 0 ? (
                <p className="text-2xl sm:text-4xl font-black text-apple-text dark:text-apple-light leading-none mt-1 tabular-nums">
                  {daysLeft} <span className="text-base sm:text-xl font-bold text-apple-subtext dark:text-slate-400">days left</span>
                </p>
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-apple-text dark:text-apple-light leading-tight mt-1">Exam time — best of luck! 💪</p>
              )}
              <p className="text-sm text-apple-subtext dark:text-slate-400 mt-1.5">Pick up the packs that close your gaps before the exam.</p>
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 sm:gap-2.5 sm:border-l sm:border-gray-100 sm:dark:border-slate-800 sm:pl-8 shrink-0">
            <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-apple-text dark:text-apple-light"><InfinityIcon className="w-4 h-4 text-apple-blue shrink-0" /> One payment, watch anytime</span>
            <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-apple-text dark:text-apple-light"><PlayCircleIcon className="w-4 h-4 text-apple-blue shrink-0" /> {totalVideos} videos · no deadline</span>
          </div>
        </div>
        {daysLeft > 0 && (
          <div className="px-5 sm:px-7 pb-5">
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#f97316)]" initial={{ width: 0 }} animate={{ width: `${elapsedPct}%` }} transition={{ duration: reduce ? 0 : 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        )}
      </section>

      {/* filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 min-w-0 sm:flex-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/50 ${
                  isActive ? 'bg-apple-blue text-white shadow-[0_6px_18px_rgba(0,112,255,0.3)]' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-apple-subtext dark:text-slate-400 hover:border-apple-blue/40 hover:text-apple-blue dark:hover:text-blue-400'}`}>
                {cat}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-800 text-apple-subtext dark:text-slate-500'}`}>{countFor(cat)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-subtext dark:text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packs…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-sm text-apple-text dark:text-apple-light placeholder-apple-subtext/50 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-apple-blue/40 focus:border-apple-blue/60 transition-all" />
        </div>
      </div>

      {!loading && (
        <AnimatePresence mode="wait">
          <motion.p key={activeCategory} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-sm text-apple-subtext dark:text-slate-400 -mt-2">
            <span className="font-semibold text-apple-text dark:text-apple-light">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'pack' : 'packs'} — {categoryDesc[activeCategory]}
          </motion.p>
        </AnimatePresence>
      )}

      {/* grid */}
      {loading ? (
        <p className="text-sm text-apple-subtext dark:text-slate-400">Loading packs…</p>
      ) : filtered.length > 0 ? (
        <motion.div key={activeCategory + search} variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((pack) => (
            <motion.div key={pack.id} variants={itemV}>
              <VideoPackCard pack={pack} status={statusFor(pack.id)} onBuy={() => setBuyingPack(pack)} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
          <SearchIcon className="w-8 h-8 text-apple-subtext/50 mb-3" />
          <h2 className="text-lg font-bold text-apple-text dark:text-apple-light mb-1">No packs found</h2>
          <p className="text-sm text-apple-subtext dark:text-slate-400 text-center max-w-xs">
            {packs.length === 0 ? 'No packs are available for your batch yet.' : 'Nothing matches that search.'}
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {buyingPack && (
          <BuyPackModal
            pack={buyingPack}
            onClose={() => setBuyingPack(null)}
            onSubmitted={() => { setBuyingPack(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
