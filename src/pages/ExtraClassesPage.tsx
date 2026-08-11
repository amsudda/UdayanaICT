import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SearchIcon, InfinityIcon } from 'lucide-react';
import { VideoPackCard } from '../components/shared/VideoPackCard';
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
  isFree?: boolean;
};

const categories = ['Monthly Lessons', 'Paper Classes', 'Lesson Packs'] as const;
const categoryDesc: Record<string, string> = {
  'Paper Classes': 'Full past-paper discussion sessions',
  'Lesson Packs': 'In-depth theory and intensive revision packs',
  'Monthly Lessons': 'Monthly live class recordings (available during the month)'
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];


export function ExtraClassesPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('Monthly Lessons');
  const [search, setSearch] = useState('');

  const [packs, setPacks] = useState<StorePack[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const examLabel = `${user?.program ?? 'A/L'}${user?.examYear ? ` ${user.examYear}` : ''}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ps }, { data: ms }, { data: enr }, { data: pend }] = await Promise.all([
      supabase.from('packs').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('theory_months').select('*').eq('is_published', true).order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('enrollments').select('pack_id, theory_month_id'),
      supabase.from('payments').select('pack_id, theory_month_id').in('kind', ['pack', 'theory']).eq('status', 'pending')
    ]);

    const list = ps ?? [];
    const monthList = ms ?? [];
    const packIds = list.map((p: any) => p.id);

    let counts: Record<string, number> = {};
    if (packIds.length) {
      const { data: pv } = await supabase.from('pack_videos').select('pack_id').in('pack_id', packIds);
      counts = (pv ?? []).reduce<Record<string, number>>((a, r: any) => { a[r.pack_id] = (a[r.pack_id] ?? 0) + 1; return a; }, {});
    }

    const ownedSet = new Set((enr ?? []).map((e: any) => e.pack_id || e.theory_month_id).filter(Boolean));
    const pendingSet = new Set((pend ?? []).map((p: any) => p.pack_id || p.theory_month_id).filter(Boolean));

    setOwned(ownedSet);
    setPending(pendingSet);

    const mappedPacks = list.map((p: any) => {
      let type = p.type ?? '';
      if (type === 'Theory' || type === 'Revision') type = 'Lesson Packs';
      return {
        id: p.id, title: p.title, type, price: Number(p.price ?? 0),
        thumbnailUrl: p.thumbnail_url ?? undefined, duration: p.duration_label ?? '',
        videoCount: counts[p.id] ?? 0, isFree: p.is_free ?? false
      };
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const mappedMonths = monthList.filter((m: any) => {
      const mIdx = MONTHS.indexOf(m.month);
      if (mIdx === -1) return true;
      if (m.year < currentYear) return false;
      if (m.year === currentYear && mIdx < currentMonth) return false;
      return true;
    }).map((m: any) => ({
      id: m.id, 
      title: Array.isArray(m.topics) && m.topics.length > 0 ? m.topics.join(' · ') : `${m.month} ${m.year} — Monthly Recordings`, 
      type: 'Monthly Lessons', 
      price: Number(m.price ?? 0),
      thumbnailUrl: m.thumbnail_url ?? undefined, 
      duration: `${m.month} ${m.year}`,
      videoCount: m.session_count ?? 0, 
      isFree: false
    }));

    setPacks([...mappedPacks, ...mappedMonths]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusFor = (id: string): 'none' | 'pending' | 'owned' =>
    owned.has(id) ? 'owned' : pending.has(id) ? 'pending' : 'none';

  const countFor = (cat: string) => packs.filter((c) => c.type === cat).length;

  const filtered = packs.filter((c) => {
    const matchCat = c.type === activeCategory;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalVideos = packs.reduce((s, c) => s + c.videoCount, 0);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.06 } } };
  const itemV = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-24 lg:pb-0">
      {/* store banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#7a0a18,#a50f24,#c20f24)] text-white shadow-[0_14px_44px_rgba(194,15,36,0.28)]">
        <div className="absolute -top-14 -right-14 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-amber-300/10 blur-2xl pointer-events-none" aria-hidden />
        <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <div className="sm:flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-200/80">{examLabel} · Lesson Store</p>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight mt-1">Choose The Lesson Pack You Need</h1>
            <p className="flex items-center gap-2 text-sm text-rose-100/75 mt-2">
              <InfinityIcon className="w-4 h-4 shrink-0" /> One-Time Payment · Watch Anytime · No Deadline
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {[
              { n: packs.length, label: 'Packs' },
              { n: totalVideos, label: 'Videos' },
              { n: owned.size, label: 'You own' }
            ].map((s) => (
              <div key={s.label} className="min-w-[76px] rounded-2xl bg-white/10 backdrop-blur px-4 py-3 text-center border border-white/10">
                <p className="text-2xl font-black leading-none tabular-nums">{s.n}</p>
                <p className="text-[11px] text-rose-100/70 font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 min-w-0 sm:flex-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/50 ${
                  isActive ? 'bg-[#c20f24] text-white shadow-[0_6px_18px_rgba(194,15,36,0.3)]' : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-apple-subtext dark:text-slate-400 hover:border-[#c20f24]/40 hover:text-[#c20f24] dark:hover:text-red-400'}`}>
                {cat}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-800 text-apple-subtext dark:text-slate-500'}`}>{countFor(cat)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-subtext dark:text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packs…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-sm text-apple-text dark:text-apple-light placeholder-apple-subtext/50 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/40 focus:border-[#c20f24]/60 transition-all" />
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
              <VideoPackCard
                pack={pack}
                status={statusFor(pack.id)}
                onBuy={() => navigate(`/dashboard/buy/${pack.id}?type=${pack.type === 'Monthly Lessons' ? 'month' : 'pack'}`)}
                onOpen={() => navigate(`/dashboard/courses?highlight=${pack.id}`)}
              />
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

    </div>
  );
}
