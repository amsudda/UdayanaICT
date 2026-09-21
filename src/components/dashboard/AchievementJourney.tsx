import { LockIcon } from 'lucide-react';
import { AchievementBadge } from '../achievements/AchievementBadge';
import { RANKS, rankForXp } from '../../data/ranks';
import type { Achievement } from '../../data/achievements';

/**
 * The achievement journey: every achievement in the game, grouped by the
 * rank tier that unlocks it.
 *
 * Tiers above the student's current rank stay visible but muted — showing
 * what is coming is the motivating part; hiding it would just make the
 * list look short.
 *
 * Presentational: the parent owns loading, so this can sit inline on the
 * rank page without another round-trip.
 */
export function AchievementJourney({ xp, items }: { xp: number; items: Achievement[] }) {
  const { current } = rankForXp(xp);
  const currentTierIndex = RANKS.findIndex((r) => r.key === current.key);
  const unlockedCount = items.filter((a) => a.unlocked).length;
  const pct = items.length ? Math.round((unlockedCount / items.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-[#E5EAF2] dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-slate-800/60">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[16px] font-semibold text-[#172033] dark:text-apple-light">Achievement Journey</h3>
          <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0">
            {unlockedCount}/{items.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-[#c20f24] transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Every achievement is worth 50 XP</p>
      </div>

      <div className="p-6 space-y-7">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No achievements configured yet.</p>
        ) : (
          RANKS.map((rank, tierIndex) => {
            const tierItems = items
              .filter((a) => a.tier === rank.key)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            if (tierItems.length === 0) return null;

            const isReached = tierIndex <= currentTierIndex;
            const isHere = tierIndex === currentTierIndex;
            const done = tierItems.filter((a) => a.unlocked).length;

            return (
              <section key={rank.key}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isReached ? rank.accent : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <h4 className={`font-bold ${isReached ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {rank.name}
                  </h4>
                  {isHere && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#c20f24] bg-[#c20f24]/10 px-2 py-0.5 rounded-full">
                      You are here
                    </span>
                  )}
                  {!isReached && <LockIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
                  <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">{done}/{tierItems.length}</span>
                </div>

                <p className="text-xs text-slate-400 mb-3 pl-5">
                  {isReached ? `${rank.minXp.toLocaleString()} XP` : `Reach ${rank.name} to start these`}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pl-5">
                  {tierItems.map((a) => (
                    <div key={a.key} className="flex items-center gap-3">
                      <AchievementBadge achKey={a.key} tier={a.tier} unlocked={a.unlocked} size={44} title={a.name} className="shrink-0" />
                      <p className="text-sm leading-snug min-w-0">
                        <span className={a.unlocked ? 'font-semibold text-slate-900 dark:text-white' : isReached ? 'font-semibold text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-400 dark:text-slate-600'}>
                          {a.name}
                        </span>
                        <span className={`ml-1.5 ${isReached ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                          · {a.description}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
