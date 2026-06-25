import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmIcon,
  LockIcon,
  PlayCircleIcon,
  ShoppingCartIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { loadLibrary, watchedCount, type LibMonth, type LibPack } from '../data/library';

const tabs = ['All', 'Video Packs', 'Monthly Recordings'] as const;
type Tab = (typeof tabs)[number];

const pct = (w: number, t: number) => (t > 0 ? Math.round((w / t) * 100) : 0);

export function MyCoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('All');
  const [packs, setPacks] = useState<LibPack[]>([]);
  const [recordings, setRecordings] = useState<LibMonth[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { packs, recordings } = await loadLibrary(user.id);
    setPacks(packs);
    setRecordings(recordings);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unlockedMonths = recordings.filter((r) => r.unlocked).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-24 lg:pb-0"
    >
      {/* header */}
      <div>
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">Learning</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-apple-text dark:text-apple-light mt-1.5 transition-colors">
          My Classes
        </h1>
        <p className="text-apple-subtext dark:text-slate-400 mt-1.5 text-sm">
          Your purchased video packs and monthly class recordings.
        </p>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Video packs', value: packs.length, icon: FilmIcon },
          { label: 'Unlocked months', value: unlockedMonths, icon: CalendarIcon },
          { label: 'Total months', value: recordings.length, icon: BookOpenIcon }
        ].map((s) => (
          <div key={s.label} className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-[#c20f24]/10 dark:bg-[#c20f24]/20 flex items-center justify-center mb-3">
              <s.icon className="w-4 h-4 text-[#c20f24]" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-apple-text dark:text-apple-light leading-none">{s.value}</p>
            <p className="text-[11px] sm:text-xs text-apple-subtext dark:text-slate-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t
                ? 'bg-[#c20f24] text-white shadow-[0_6px_18px_rgba(194,15,36,0.3)]'
                : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-apple-subtext dark:text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-apple-subtext dark:text-slate-400">Loading your classes…</p>
      ) : (
        <>
          {/* ── video packs ── */}
          {(tab === 'All' || tab === 'Video Packs') && (
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#c20f24]/10 dark:bg-[#c20f24]/20 flex items-center justify-center">
                  <FilmIcon className="w-4 h-4 text-[#c20f24]" />
                </div>
                <h2 className="text-xl font-bold text-apple-text dark:text-apple-light">Purchased Video Packs</h2>
              </div>

              {packs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-8 text-center">
                  <p className="text-sm text-apple-subtext dark:text-slate-400 mb-3">You haven't bought any packs yet.</p>
                  <button onClick={() => navigate('/dashboard/extra-classes')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#c20f24] hover:underline">
                    <ShoppingCartIcon className="w-4 h-4" /> Browse the store
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {packs.map((p) => {
                    const w = watchedCount(p.id);
                    const progress = pct(w, p.videoCount);
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/dashboard/watch/${p.id}`)}
                        className="group text-left bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-transform"
                      >
                        <div className="relative overflow-hidden bg-slate-100" style={{ aspectRatio: '16/9' }}>
                          {p.thumbnailUrl && <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                          <span className="absolute top-3 left-3 text-[11px] font-semibold bg-[#c20f24]/90 text-white px-2.5 py-1 rounded-full">{p.type}</span>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><PlayCircleIcon className="w-7 h-7 text-[#c20f24]" /></span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-bold text-apple-text dark:text-apple-light leading-snug line-clamp-2 mb-2">{p.title}</h3>
                          <p className="text-xs text-apple-subtext dark:text-slate-400">{p.videoCount} videos{p.duration ? ` · ${p.duration}` : ''}</p>
                          {progress > 0 && (
                            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-[#c20f24]" style={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── monthly recordings ── */}
          {(tab === 'All' || tab === 'Monthly Recordings') && (
            <section className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <BookOpenIcon className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                </div>
                <h2 className="text-xl font-bold text-apple-text dark:text-apple-light">Monthly Class Recordings</h2>
              </div>

              {recordings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-8 text-center">
                  <p className="text-sm text-apple-subtext dark:text-slate-400">No recordings published for your batch yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recordings.map((m) => {
                    const w = watchedCount(m.id);
                    const progress = pct(w, m.sessionCount);
                    return (
                      <button
                        key={m.id}
                        onClick={() => (m.unlocked ? navigate(`/dashboard/watch/${m.id}`) : navigate('/dashboard/payments'))}
                        className={`group text-left bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden transition-transform active:scale-[0.98] ${
                          m.unlocked ? 'border-gray-100 dark:border-slate-800' : 'border-amber-200 dark:border-amber-500/30'
                        }`}
                      >
                        <div className="relative overflow-hidden bg-violet-100 dark:bg-slate-800" style={{ aspectRatio: '16/9' }}>
                          {m.thumbnailUrl ? (
                            <img src={m.thumbnailUrl} alt="" className={`w-full h-full object-cover ${m.unlocked ? '' : 'opacity-40'}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-violet-400"><CalendarIcon className="w-8 h-8" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                          {m.unlocked ? (
                            <span className="absolute top-3 right-3 text-[11px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full">Unlocked</span>
                          ) : (
                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
                              <LockIcon className="w-6 h-6" />
                              <span className="text-xs font-semibold">Pay this month's fee to unlock</span>
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-bold text-apple-text dark:text-apple-light leading-snug">{m.month} {m.year}</h3>
                          <p className="text-xs text-apple-subtext dark:text-slate-400 mt-1 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" /> {m.sessionCount} session{m.sessionCount === 1 ? '' : 's'}
                          </p>
                          {m.unlocked && progress > 0 && (
                            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                            </div>
                          )}
                          {m.unlocked && progress >= 100 && (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Completed</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </motion.div>
  );
}
