import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AwardIcon, CalendarIcon, LockIcon, SparklesIcon, ZapIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { loadAchievements, type Achievement } from '../data/achievements';
import { loadMyXp } from '../data/xp';
import { RANKS, rankForXp } from '../data/ranks';
import { AchievementBadge, RankEmblem } from '../components/achievements/AchievementBadge';
import { LogoLoader } from '../components/shared/LogoLoader';

type Filter = 'all' | 'unlocked' | 'locked';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Every achievement, grouped by the rank tier it belongs to. Tiers above the
 * student's rank stay visible but faded — seeing what's ahead is the point.
 */
export function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([loadAchievements(user.id), loadMyXp()]).then(([achv, total]) => {
      if (!active) return;
      setAchievements(achv);
      setXp(total);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  if (loading) return <LogoLoader variant="inline" label="Loading achievements..." className="min-h-[60vh]" />;

  const { current } = rankForXp(xp);
  const currentIndex = RANKS.findIndex((r) => r.key === current.key);
  const tierIndex = (t: string) => RANKS.findIndex((r) => r.key === t);

  const unlocked = achievements.filter((a) => a.unlocked);
  const total = achievements.length;
  const pct = total ? Math.round((unlocked.length / total) * 100) : 0;
  const xpFromAchievements = unlocked.reduce((sum, a) => sum + a.xp, 0);
  const latest = [...unlocked].sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))[0];
  const nextUp = achievements
    .filter((a) => !a.unlocked && tierIndex(a.tier) <= currentIndex)
    .sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier) || a.sortOrder - b.sortOrder)[0];

  const visible = achievements.filter((a) => (filter === 'all' ? true : filter === 'unlocked' ? a.unlocked : !a.unlocked));
  const groups = RANKS.map((rank, i) => ({
    rank,
    reached: i <= currentIndex,
    items: visible.filter((a) => a.tier === rank.key).sort((a, b) => a.sortOrder - b.sortOrder),
    unlockedCount: achievements.filter((a) => a.tier === rank.key && a.unlocked).length,
    totalCount: achievements.filter((a) => a.tier === rank.key).length
  })).filter((g) => g.items.length > 0);

  // progress ring geometry
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 text-zinc-900 dark:text-white">
      {/* ── Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-950 via-[#2a0509] to-[#7a0c17] text-white p-6 sm:p-8 shadow-xl shadow-red-950/30"
      >
        <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-8">
          {/* progress ring */}
          <div className="relative w-36 h-36 shrink-0 self-center md:self-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx={60} cy={60} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
              <motion.circle
                cx={60} cy={60} r={R} fill="none" strokeWidth={10} strokeLinecap="round"
                stroke="url(#achv-ring)" strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - pct / 100) }}
                transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
              />
              <defs>
                <linearGradient id="achv-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black tabular-nums leading-none">{unlocked.length}</span>
              <span className="text-[11px] font-bold text-white/50 mt-1">of {total}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">Your collection</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-1">Achievements</h1>
            <p className="text-sm text-white/60 mt-2">{pct}% collected · every achievement is worth 50 XP.</p>

            <div className="grid grid-cols-2 gap-3 mt-5 max-w-md">
              <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50"><ZapIcon className="w-3 h-3" /> XP earned</p>
                <p className="text-xl font-black tabular-nums mt-0.5">+{xpFromAchievements.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50"><AwardIcon className="w-3 h-3" /> Tiers open</p>
                <p className="text-xl font-black tabular-nums mt-0.5">{currentIndex + 1}/{RANKS.length}</p>
              </div>
            </div>
          </div>

          {/* spotlight: latest unlock, or the next one to chase */}
          {(latest || nextUp) && (
            <div className="rounded-3xl bg-white/[0.07] border border-white/10 p-5 flex flex-col items-center text-center md:w-56 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" /> {latest ? 'Latest unlock' : 'Next up'}
              </p>
              <AchievementBadge achKey={(latest ?? nextUp)!.key} tier={(latest ?? nextUp)!.tier} unlocked={!!latest} size={92} className="drop-shadow-2xl" />
              <p className="font-bold mt-2 leading-tight">{(latest ?? nextUp)!.name}</p>
              <p className="text-[11px] text-white/60 mt-1 leading-snug">{(latest ?? nextUp)!.description}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Filters ── */}
      <div className="flex gap-2">
        {([['all', `All ${total}`], ['unlocked', `Unlocked ${unlocked.length}`], ['locked', `Locked ${total - unlocked.length}`]] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              filter === f ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-red-500/25' : 'bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-red-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 p-12 text-center shadow-sm">
          <p className="font-bold">No achievements yet</p>
          <p className="text-sm text-zinc-500 mt-1">Achievements will appear here once they're set up.</p>
        </div>
      ) : groups.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-10">
          {filter === 'unlocked' ? 'Nothing unlocked yet — finish a quiz to earn your first.' : 'You’ve unlocked everything. Legendary.'}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g, gi) => (
            <motion.section
              key={g.rank.key}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 + gi * 0.05, ease: EASE }}
              className={`rounded-3xl border p-5 sm:p-6 shadow-sm ${
                g.reached ? 'bg-white dark:bg-[#121214] border-zinc-100 dark:border-zinc-800' : 'bg-zinc-50/80 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <header className="flex items-center gap-3 mb-5">
                <RankEmblem rankKey={g.rank.key} size={52} locked={!g.reached} className="-my-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-black ${g.reached ? '' : 'text-zinc-400'}`}>{g.rank.name}</h2>
                  <p className="text-xs text-zinc-500">
                    {g.reached ? `${g.unlockedCount} of ${g.totalCount} unlocked` : `Reach ${g.rank.name} (${g.rank.minXp.toLocaleString()} XP) to start these`}
                  </p>
                </div>
                {!g.reached && <LockIcon className="w-4 h-4 text-zinc-400" />}
                {g.reached && g.totalCount > 0 && (
                  <div className="hidden sm:block w-28">
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-600" style={{ width: `${(g.unlockedCount / g.totalCount) * 100}%` }} />
                    </div>
                  </div>
                )}
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((a) => (
                  <div
                    key={a.key}
                    className={`group relative flex items-center gap-4 rounded-2xl border p-3.5 transition-all ${
                      a.unlocked
                        ? 'bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-500/5 dark:to-transparent border-amber-200/70 dark:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5'
                        : g.reached
                          ? 'bg-white dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800'
                          : 'bg-transparent border-zinc-100 dark:border-zinc-800 opacity-70'
                    }`}
                  >
                    <AchievementBadge achKey={a.key} tier={a.tier} unlocked={a.unlocked} size={72} title={a.name}
                      className={`shrink-0 -my-1 ${a.unlocked ? 'drop-shadow-lg group-hover:scale-105 transition-transform' : ''}`} />
                    <div className="min-w-0">
                      <p className={`font-bold leading-tight ${a.unlocked ? '' : 'text-zinc-500 dark:text-zinc-400'}`}>{a.name}</p>
                      <p className="text-xs text-zinc-500 mt-1 leading-snug">{a.description}</p>
                      <p className="mt-2 flex items-center gap-2 text-[11px] font-bold">
                        <span className={a.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}>+{a.xp} XP</span>
                        {a.unlocked && a.unlockedAt && (
                          <span className="flex items-center gap-1 text-zinc-400 font-medium">
                            <CalendarIcon className="w-3 h-3" /> {new Date(a.unlockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
