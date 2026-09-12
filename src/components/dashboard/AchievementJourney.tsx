import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2Icon, CircleIcon, LockIcon, XIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { RANKS, rankForXp } from '../../data/ranks';
import { loadAchievements, type Achievement } from '../../data/achievements';

/**
 * The achievement journey: every achievement in the game, grouped by the
 * rank tier that unlocks it.
 *
 * Tiers above the student's current rank stay visible but muted — showing
 * what is coming is the motivating part; hiding it would just make the
 * list look short.
 */
export function AchievementJourney({ xp, onClose }: { xp: number; onClose: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const data = await loadAchievements(user.id);
      if (!active) return;
      setItems(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  // close on Escape, like the app's other overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { current } = rankForXp(xp);
  const currentTierIndex = RANKS.findIndex((r) => r.key === current.key);
  const unlockedCount = items.filter((a) => a.unlocked).length;
  const pct = items.length ? Math.round((unlockedCount / items.length) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Achievement Journey"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Achievement Journey</h3>
            <button onClick={onClose} aria-label="Close" className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#c20f24] transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0">
              {unlockedCount}/{items.length || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Every achievement is worth 50 XP</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-7">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No achievements configured yet.</p>
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
                      <div key={a.key} className="flex items-start gap-2">
                        {a.unlocked ? (
                          <CheckCircle2Icon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <CircleIcon className={`w-4 h-4 shrink-0 mt-0.5 ${isReached ? 'text-slate-300 dark:text-slate-600' : 'text-slate-200 dark:text-slate-700'}`} />
                        )}
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
    </div>,
    document.body
  );
}
