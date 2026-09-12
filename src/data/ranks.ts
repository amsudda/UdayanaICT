/**
 * The rank ladder.
 *
 * Thresholds are deliberately non-linear — each rank costs more than the
 * one before it, so later ranks stay meaningful instead of ticking over
 * every few quizzes. These are a starting balance, not sacred numbers:
 * once there is a term of real XP data, retune them against how much a
 * typical engaged student actually earns per month.
 *
 * XP itself is configured in the database (`xp_rules`), not here.
 */
export type Rank = {
  key: string;
  name: string;
  minXp: number;
  /** Tailwind classes for the rank's accent, used by badges and the rank path. */
  accent: string;
  text: string;
};

export const RANKS: Rank[] = [
  { key: 'novice',     name: 'Novice',     minXp: 0,    accent: 'bg-slate-400',   text: 'text-slate-600' },
  { key: 'cadet',      name: 'Cadet',      minXp: 400,  accent: 'bg-amber-600',   text: 'text-amber-700' },
  { key: 'apprentice', name: 'Apprentice', minXp: 900,  accent: 'bg-emerald-500', text: 'text-emerald-600' },
  { key: 'explorer',   name: 'Explorer',   minXp: 1600, accent: 'bg-sky-500',     text: 'text-sky-600' },
  { key: 'expert',     name: 'Expert',     minXp: 2600, accent: 'bg-violet-500',  text: 'text-violet-600' },
  { key: 'elite',      name: 'Elite',      minXp: 3900, accent: 'bg-orange-500',  text: 'text-orange-600' },
  { key: 'master',     name: 'Master',     minXp: 5500, accent: 'bg-yellow-500',  text: 'text-yellow-600' },
  { key: 'champion',   name: 'Champion',   minXp: 7500, accent: 'bg-[#c20f24]',   text: 'text-[#c20f24]' }
];

export type RankProgress = {
  current: Rank;
  /** null once the top rank is reached. */
  next: Rank | null;
  /** 0-100, progress through the current rank. 100 at the top rank. */
  progressPct: number;
  /** XP earned since entering the current rank. */
  xpIntoRank: number;
  /** XP still needed to reach the next rank. 0 at the top rank. */
  xpToNext: number;
};

export function rankForXp(xp: number): RankProgress {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;

  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (safeXp >= RANKS[i].minXp) index = i;
  }

  const current = RANKS[index];
  const next = index < RANKS.length - 1 ? RANKS[index + 1] : null;

  if (!next) {
    return { current, next: null, progressPct: 100, xpIntoRank: safeXp - current.minXp, xpToNext: 0 };
  }

  const span = next.minXp - current.minXp;
  const xpIntoRank = safeXp - current.minXp;
  return {
    current,
    next,
    progressPct: Math.min(100, Math.round((xpIntoRank / span) * 100)),
    xpIntoRank,
    xpToNext: Math.max(0, next.minXp - safeXp)
  };
}
