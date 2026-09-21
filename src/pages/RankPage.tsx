import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon, AwardIcon, CheckIcon, CrownIcon, FlameIcon, LockIcon, ZapIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { RANKS, rankForXp } from '../data/ranks';
import { loadMyXp, loadWeeklyXp, loadXpFeed, loadLeaderboard, type XpEntry, type LeaderRow } from '../data/xp';
import { loadAchievements, type Achievement } from '../data/achievements';
import { XP_SOURCES, XP_CATEGORIES } from '../data/xpRules';
import { AchievementJourney } from '../components/dashboard/AchievementJourney';
import { LeaderboardCard } from '../components/dashboard/LeaderboardCard';
import { LogoLoader } from '../components/shared/LogoLoader';
import { RankEmblem } from '../components/achievements/AchievementBadge';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: EASE }
});

/**
 * The rank page — the home of XP, ranks, achievements and the leaderboard.
 * Every number here is real: XP comes from the server-side ledger, ranks from
 * src/data/ranks.ts, achievements and the batch leaderboard from Supabase.
 */
export function RankPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [xp, setXp] = useState(0);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [feed, setFeed] = useState<XpEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [total, week, entries, achv, rows] = await Promise.all([
        loadMyXp(),
        loadWeeklyXp(user.id),
        loadXpFeed(user.id, 6),
        loadAchievements(user.id),
        loadLeaderboard('all_time', 50)
      ]);
      if (!active) return;
      setXp(total);
      setWeeklyXp(week);
      setFeed(entries);
      setAchievements(achv);
      setBoard(rows);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) return <LogoLoader variant="inline" label="Loading your rank..." className="min-h-[60vh]" />;

  const { current, next, progressPct, xpToNext } = rankForXp(xp);
  const currentIndex = RANKS.findIndex((r) => r.key === current.key);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const myPosition = user ? board.find((r) => r.studentId === user.id)?.position : undefined;

  const stats = [
    { label: next ? `XP to ${next.name}` : 'Top rank', value: next ? xpToNext.toLocaleString() : '—', icon: ZapIcon, grad: 'from-amber-400 to-orange-500' },
    { label: 'This week', value: `+${weeklyXp.toLocaleString()}`, icon: FlameIcon, grad: 'from-orange-400 to-red-500' },
    { label: 'Achievements', value: `${unlocked}/${achievements.length || 0}`, icon: AwardIcon, grad: 'from-rose-400 to-red-600' },
    { label: 'Batch position', value: myPosition ? `#${myPosition}` : '—', icon: CrownIcon, grad: 'from-red-500 to-red-700' }
  ];

  return (
    <div className="space-y-6 pb-10 text-zinc-900 dark:text-white">
      {/* ── Hero ── */}
      <motion.section {...reveal()} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-950 via-[#2a0509] to-[#6b0a15] text-white p-6 sm:p-8 shadow-xl shadow-red-950/30">
        <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 left-[38%] w-24 h-[170%] bg-gradient-to-b from-white/[0.06] to-transparent rotate-[25deg]" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <RankEmblem rankKey={current.key} size={128} title={`${current.name} rank`} className="shrink-0 self-start md:self-auto -m-3 drop-shadow-2xl" />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">Your Rank</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none mt-1">{current.name}</h1>
            <p className="text-sm text-white/60 mt-2">Rank {currentIndex + 1} of {RANKS.length}</p>
          </div>

          <div className="md:text-right shrink-0">
            <p className="text-4xl sm:text-5xl font-black tabular-nums leading-none bg-gradient-to-br from-amber-200 to-orange-400 bg-clip-text text-transparent">
              {xp.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mt-1.5">Total XP</p>
            {weeklyXp > 0 && (
              <p className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                <FlameIcon className="w-3 h-3" /> +{weeklyXp.toLocaleString()} this week
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-7">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-white/60">{progressPct}% through {current.name}</span>
            {next ? (
              <span className="text-white/80"><span className="font-black text-amber-300">{xpToNext.toLocaleString()} XP</span> to {next.name}</span>
            ) : (
              <span className="text-amber-300 font-bold">Top rank reached</span>
            )}
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${next ? Math.max(progressPct, 2) : 100}%` }}
              transition={{ duration: 1, delay: 0.25, ease: EASE }}
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 shadow-[0_0_16px_rgba(251,146,60,0.6)]"
            />
          </div>
        </div>
      </motion.section>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...reveal(0.06 + i * 0.05)}
            className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 p-5 flex items-center gap-4 shadow-sm"
          >
            <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center shrink-0 shadow-md`}>
              <s.icon className="w-5 h-5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-black tabular-nums leading-none">{s.value}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mt-1.5 truncate">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Rank ladder ── */}
      <motion.section {...reveal(0.12)} className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-[16px]">Rank Path</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Each rank needs more XP than the last.</p>
          </div>
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full">
            {currentIndex + 1}/{RANKS.length} reached
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {RANKS.map((r, i) => {
            const done = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div
                key={r.key}
                className={`relative rounded-2xl p-3 text-center border transition-all ${
                  isCurrent
                    ? 'border-red-300 dark:border-red-800 bg-gradient-to-b from-red-50 to-white dark:from-red-950/40 dark:to-[#121214] shadow-lg shadow-red-500/10'
                    : done
                      ? 'border-orange-100 dark:border-zinc-800 bg-orange-50/40 dark:bg-zinc-900/60'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-red-600 px-2 py-0.5 rounded-full shadow">
                    You
                  </span>
                )}
                <div className="relative mx-auto w-14 h-14 mb-1">
                  <RankEmblem rankKey={r.key} size={56} locked={!done && !isCurrent} title={r.name} />
                  {done && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121214] flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </span>
                  )}
                  {!done && !isCurrent && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-700 border-2 border-white dark:border-[#121214] flex items-center justify-center">
                      <LockIcon className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <p className={`text-xs font-bold ${isCurrent ? 'text-red-600 dark:text-red-400' : done ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400'}`}>{r.name}</p>
                <p className="text-[10px] text-zinc-400 tabular-nums mt-0.5">{r.minXp.toLocaleString()} XP</p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ── Journey + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <motion.div {...reveal(0.16)}>
          <AchievementJourney xp={xp} items={achievements} />
        </motion.div>

        <div className="space-y-6">
          <motion.div {...reveal(0.2)}>
            <LeaderboardCard />
          </motion.div>

          {/* How to earn XP */}
          <motion.section {...reveal(0.24)} className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-50 dark:border-zinc-800/60">
              <h3 className="font-bold text-[16px]">How to earn XP</h3>
              <p className="text-xs text-zinc-500 mt-0.5">XP is awarded automatically — it can't be added by hand.</p>
            </div>
            <div className="p-5 space-y-4">
              {XP_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">{cat}</p>
                  <div className="space-y-1.5">
                    {XP_SOURCES.filter((s) => s.category === cat).map((s) => (
                      <div key={`${cat}-${s.action}`} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300 truncate">{s.action}</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">+{s.xp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Recent XP */}
          <motion.section {...reveal(0.28)} className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-50 dark:border-zinc-800/60 flex items-center justify-between">
              <h3 className="font-bold text-[16px]">Recent XP</h3>
              <button onClick={() => navigate('/dashboard/xp')} className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1">
                Full history <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4">
              {feed.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">Complete a quiz or sit a paper to start earning XP.</p>
              ) : (
                <div className="space-y-1">
                  {feed.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <span className="inline-flex items-center justify-center min-w-[44px] h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{e.amount}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-snug">{e.reason}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(e.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
