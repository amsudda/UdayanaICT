import { useEffect, useState } from 'react';
import { TrophyIcon, ZapIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';
import { RANKS, rankForXp } from '../../data/ranks';
import { loadMyXp, loadXpFeed, type XpEntry } from '../../data/xp';
import { AchievementJourney } from './AchievementJourney';

/**
 * Current rank, progress to the next one, and the recent XP that earned it.
 * The feed matters as much as the number: a student should be able to answer
 * "why do I have this much XP?" without asking.
 */
export function RankCard() {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [feed, setFeed] = useState<XpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [journeyOpen, setJourneyOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [total, entries] = await Promise.all([loadMyXp(), loadXpFeed(user.id, 4)]);
      if (!active) return;
      setXp(total);
      setFeed(entries);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const { current, next, progressPct, xpToNext } = rankForXp(xp);
  const currentIndex = RANKS.findIndex((r) => r.key === current.key);

  return (
    <DashboardCard className="h-full" delay={0.15}>
      <DashboardCardHeader>
        <DashboardCardTitle icon={TrophyIcon}>Your Rank</DashboardCardTitle>
        <span className="text-xs font-bold text-slate-400 tabular-nums">{xp.toLocaleString()} XP</span>
      </DashboardCardHeader>

      <DashboardCardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <p className={`text-2xl font-black tracking-tight ${current.text} dark:text-white`}>
                {current.name}
              </p>
              {next && (
                <p className="text-xs font-semibold text-slate-400 shrink-0">
                  {xpToNext.toLocaleString()} XP to {next.name}
                </p>
              )}
            </div>

            {/* progress through the current rank */}
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${current.accent} transition-[width] duration-700 ease-out`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* rank path — where they are on the whole ladder */}
            <div className="flex items-center gap-1 mt-4" aria-hidden="true">
              {RANKS.map((r, i) => (
                <div
                  key={r.key}
                  title={`${r.name} · ${r.minXp.toLocaleString()} XP`}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < currentIndex ? r.accent
                      : i === currentIndex ? `${r.accent} ring-2 ring-offset-2 ring-slate-200 dark:ring-offset-slate-900 dark:ring-slate-700`
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{RANKS[0].name}</span>
              <span>{RANKS[RANKS.length - 1].name}</span>
            </div>

            {/* why they have this XP */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setJourneyOpen(true)}
                className="w-full mb-3 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                View Achievement Journey
              </button>
              {feed.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Complete a quiz or sit a paper to start earning XP.
                </p>
              ) : (
                <div className="space-y-2">
                  {feed.map((e) => (
                    <div key={e.id} className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                        <ZapIcon className="w-3 h-3" />+{e.amount}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{e.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DashboardCardContent>

      {journeyOpen && <AchievementJourney xp={xp} onClose={() => setJourneyOpen(false)} />}
    </DashboardCard>
  );
}
