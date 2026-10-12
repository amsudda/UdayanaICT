import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  AwardIcon,
  CrownIcon,
  FileTextIcon,
  MedalIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { loadPaperLeaderboard, type PaperLeaderRow, type PaperType } from '../data/xp';
import { LogoLoader } from '../components/shared/LogoLoader';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FULL_BOARD_LIMIT = 10000;
const FILTERS: Array<{ value: PaperType; label: string; description: string }> = [
  { value: 'all', label: 'Overall', description: 'All marked papers' },
  { value: 'full', label: 'Full papers', description: 'Full paper results' },
  { value: 'timing', label: 'Timing papers', description: 'Timed practice results' }
];

function Avatar({ row, size }: { row: PaperLeaderRow; size: string }) {
  return row.avatarUrl ? (
    <img src={row.avatarUrl} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 font-black text-zinc-600 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-300`}>
      {row.displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function Podium({ rows, currentStudentId }: { rows: PaperLeaderRow[]; currentStudentId?: string }) {
  const places = [2, 1, 3].map((position) => rows.find((row) => row.position === position));
  const colors: Record<number, string> = {
    1: 'border-amber-300 bg-amber-50/70 dark:border-amber-700/60 dark:bg-amber-950/20',
    2: 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70',
    3: 'border-orange-200 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20'
  };
  const emblems: Record<number, string> = {
    1: 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950',
    2: 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-800',
    3: 'bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50'
  };

  return (
    <section aria-label="Top three paper rankings" className="grid grid-cols-3 items-end gap-2 sm:gap-5">
      {places.map((row, index) => {
        const position = [2, 1, 3][index];
        if (!row) return <div key={position} aria-hidden="true" />;
        const isMe = row.studentId === currentStudentId;
        return (
          <motion.article
            key={row.studentId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
            className={`flex min-w-0 flex-col items-center rounded-2xl border px-2 pb-4 pt-5 text-center sm:px-5 sm:pt-6 ${colors[position]} ${position === 1 ? 'min-h-[214px]' : 'min-h-[184px]'}`}
          >
            <div className="relative">
              {position === 1 && <CrownIcon className="absolute -top-5 left-1/2 h-5 w-5 -translate-x-1/2 fill-amber-300 text-amber-500" />}
              <span className={`absolute -bottom-1 -right-1 z-10 grid h-6 w-6 place-items-center rounded-full text-[10px] font-black shadow-sm ${emblems[position]}`}>{position}</span>
              <Avatar row={row} size={position === 1 ? 'h-16 w-16 sm:h-20 sm:w-20 text-2xl' : 'h-12 w-12 sm:h-16 sm:w-16 text-xl'} />
            </div>
            <p className={`mt-3 w-full truncate text-xs font-bold sm:text-sm ${isMe ? 'text-[#c20f24] dark:text-red-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
              {isMe ? 'You' : row.displayName}
            </p>
            {row.studentCode && <p className="mt-0.5 text-[9px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">{row.studentCode}</p>}
            <p className="mt-1 text-xl font-black tabular-nums text-zinc-950 dark:text-white sm:text-2xl">{row.avgPct.toFixed(1)}%</p>
            <p className="mt-0.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{row.papers} {row.papers === 1 ? 'paper' : 'papers'}</p>
          </motion.article>
        );
      })}
    </section>
  );
}

export function PaperLeaderboardPage() {
  const { user } = useAuth();
  const [type, setType] = useState<PaperType>('all');
  const [rows, setRows] = useState<PaperLeaderRow[] | null>(null);

  useEffect(() => {
    let active = true;
    setRows(null);
    loadPaperLeaderboard(type, FULL_BOARD_LIMIT).then((result) => {
      if (active) setRows(result);
    });
    return () => { active = false; };
  }, [type]);

  if (rows === null) return <LogoLoader variant="inline" label="Loading paper leaderboard..." className="min-h-[60vh]" />;

  const me = rows.find((row) => row.studentId === user?.id);
  const leader = rows[0];
  const topThree = rows.filter((row) => row.position <= 3);
  const selected = FILTERS.find((filter) => filter.value === type) ?? FILTERS[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-12 text-zinc-900 dark:text-white sm:space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-950 via-[#2a0509] to-[#7a0c17] p-5 text-white shadow-xl shadow-red-950/20 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[30%] h-px w-52 bg-gradient-to-r from-transparent via-red-300/50 to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 sm:text-[11px]">
              <FileTextIcon className="h-4 w-4" /> Paper performance
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Paper leaderboard</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              Compare paper averages across your shared batches. Student codes distinguish classmates who share a name.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Your position</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{me ? `#${me.position}` : '—'}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{me ? `${me.avgPct.toFixed(1)}% average` : `${user?.studentId || 'Your account'} · No marks yet`}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">On the board</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{rows.length}</p>
              <p className="mt-0.5 text-[10px] text-white/50">students with marks</p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Rank by</span>
          {FILTERS.map((filter) => {
            const active = type === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setType(filter.value)}
                aria-pressed={active}
                className={`min-h-9 rounded-xl px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active ? 'bg-white text-zinc-950 shadow-sm' : 'bg-white/10 text-white/65 hover:bg-white/15 hover:text-white'}`}
              >
                {filter.label}
              </button>
            );
          })}
          <span className="ml-auto hidden text-[11px] text-white/45 sm:inline">{selected.description}</span>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#121214] sm:p-5">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><UsersIcon className="h-3.5 w-3.5" /> Ranked students</p>
          <p className="mt-3 text-2xl font-black tabular-nums">{rows.length}</p>
        </article>
        <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#121214] sm:p-5">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><TargetIcon className="h-3.5 w-3.5" /> Your average</p>
          <p className="mt-3 text-2xl font-black tabular-nums">{me ? `${me.avgPct.toFixed(1)}%` : '—'}</p>
        </article>
        <article className="col-span-2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#121214] sm:col-span-1 sm:p-5">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400"><AwardIcon className="h-3.5 w-3.5" /> Highest average</p>
          <p className="mt-3 truncate text-2xl font-black tabular-nums">{leader ? `${leader.avgPct.toFixed(1)}%` : '—'}</p>
          {leader && <p className="mt-1 truncate text-[11px] text-zinc-500">{leader.displayName}</p>}
        </article>
      </div>

      {rows.length === 0 ? (
        <section className="rounded-3xl border border-zinc-100 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-800 dark:bg-[#121214]">
          <TrophyIcon className="mx-auto h-11 w-11 text-zinc-300 dark:text-zinc-700" />
          <h2 className="mt-4 text-lg font-bold">No {type === 'all' ? 'paper' : selected.label.toLowerCase()} marks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Once marks are added for students in your shared batches, the rankings will appear here.</p>
          <Link to="/dashboard/my-papers" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#c20f24] hover:underline">
            View my paper progress <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <>
          {topThree.length > 0 && (
            <section className="rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#121214] sm:p-6">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold sm:text-lg">Top performers</h2>
                  <p className="mt-1 text-xs text-zinc-500">{selected.description} · ranked by average, then papers completed</p>
                </div>
                <MedalIcon className="h-5 w-5 shrink-0 text-amber-500" />
              </div>
              <Podium rows={topThree} currentStudentId={user?.id} />
            </section>
          )}

          <section className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#121214]">
            <header className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-6">
              <div>
                <h2 className="text-base font-bold sm:text-lg">Full leaderboard</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Every student with a marked result, identified by student code</p>
              </div>
              <Link to="/dashboard/my-papers" className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-[#c20f24] hover:underline sm:text-xs">
                My progress <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </header>

            <div className="hidden grid-cols-[64px_minmax(0,1fr)_110px_110px_120px] gap-3 bg-zinc-50 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:bg-zinc-900/70 sm:grid">
              <span>Place</span><span>Student</span><span className="text-right">Papers</span><span className="text-right">Best</span><span className="text-right">Average</span>
            </div>

            <div>
              {rows.map((row, index) => {
                const isMe = row.studentId === user?.id;
                const podium = row.position <= 3;
                return (
                  <article
                    key={row.studentId}
                    className={`grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 sm:grid-cols-[64px_minmax(0,1fr)_110px_110px_120px] sm:gap-3 sm:px-6 ${index > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''} ${isMe ? 'bg-red-50/70 dark:bg-red-950/20' : 'transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40'}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black tabular-nums ${podium ? row.position === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300' : row.position === 2 ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' : 'text-zinc-400'}`}>
                      {row.position}
                    </span>

                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar row={row} size="h-10 w-10 text-sm" />
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-bold ${isMe ? 'text-[#c20f24] dark:text-red-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                          {isMe ? 'You' : row.displayName}
                          {isMe && <span className="ml-2 rounded-full bg-[#c20f24] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">You</span>}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-zinc-400">{row.studentCode || 'Student code unavailable'}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-400 sm:hidden">{row.papers} papers · best {row.bestPct.toFixed(1)}%</p>
                      </div>
                    </div>

                    <span className="text-right text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300 sm:text-sm">{row.papers}<span className="hidden sm:inline"> papers</span></span>
                    <span className="hidden text-right text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-300 sm:block">{row.bestPct.toFixed(1)}%</span>
                    <span className="text-right text-sm font-black tabular-nums text-zinc-950 dark:text-white sm:text-base">{row.avgPct.toFixed(1)}%</span>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
