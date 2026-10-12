import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon, CrownIcon, FlameIcon, TrophyIcon, UsersIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { loadBatchLeaderboard, loadMyBatches, type LeaderRow, type StudentBatch } from '../data/xp';
import { rankForXp } from '../data/ranks';
import { RankEmblem } from '../components/achievements/AchievementBadge';
import { LogoLoader } from '../components/shared/LogoLoader';

type Scope = 'weekly' | 'all_time';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FULL_LEADERBOARD_LIMIT = 10000;

const PODIUM = {
  1: { ring: 'ring-yellow-400', glow: 'shadow-yellow-400/40', badge: 'from-yellow-300 to-amber-500', height: 'h-28', label: '1st' },
  2: { ring: 'ring-zinc-300', glow: 'shadow-zinc-400/30', badge: 'from-zinc-200 to-zinc-400', height: 'h-20', label: '2nd' },
  3: { ring: 'ring-amber-600', glow: 'shadow-amber-700/30', badge: 'from-amber-500 to-amber-700', height: 'h-14', label: '3rd' }
} as const;

function Avatar({ row, size }: { row: LeaderRow; size: string }) {
  return row.avatarUrl ? (
    <img src={row.avatarUrl} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center font-black text-zinc-600 dark:text-zinc-300`}>
      {row.displayName.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The batch leaderboard. Positions come from the chosen board (this week or
 * all time), but the rank emblem beside a name always reflects that student's
 * all-time XP — ranking someone "Novice" because it's Monday would be wrong.
 */
export function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('weekly');
  const [batches, setBatches] = useState<StudentBatch[] | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [boards, setBoards] = useState<Record<Scope, LeaderRow[] | null>>({ weekly: null, all_time: null });

  useEffect(() => {
    let active = true;
    if (!user) {
      setBatches([]);
      return () => { active = false; };
    }
    loadMyBatches(user.id).then((studentBatches) => {
      if (!active) return;
      setBatches(studentBatches);
      setSelectedBatchId((current) => {
        if (current && studentBatches.some((batch) => batch.id === current)) return current;
        const preferred = studentBatches.find((batch) =>
          batch.examYear === Number(user.examYear) && batch.program === user.program
        );
        return (preferred ?? studentBatches[0])?.id ?? '';
      });
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!selectedBatchId) {
      setBoards({ weekly: null, all_time: null });
      return () => { active = false; };
    }
    setBoards({ weekly: null, all_time: null });
    Promise.all([
      loadBatchLeaderboard(selectedBatchId, 'weekly', FULL_LEADERBOARD_LIMIT),
      loadBatchLeaderboard(selectedBatchId, 'all_time', FULL_LEADERBOARD_LIMIT)
    ]).then(([weekly, allTime]) => {
      if (active) setBoards({ weekly, all_time: allTime });
    });
    return () => { active = false; };
  }, [selectedBatchId]);

  if (batches === null || (selectedBatchId && (!boards.weekly || !boards.all_time))) {
    return <LogoLoader variant="inline" label="Loading leaderboard..." className="min-h-[60vh]" />;
  }

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);
  const currentBoards = boards.weekly && boards.all_time ? boards : null;
  if (!selectedBatch || !currentBoards) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-6 text-center text-zinc-900 dark:text-white">
        <UsersIcon className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
        <h1 className="text-2xl font-black">No batch leaderboard yet</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">You’ll see your XP rankings here once you’re enrolled in a class batch.</p>
      </div>
    );
  }

  const rows = currentBoards[scope] ?? [];
  const allTimeXp = new Map(currentBoards.all_time.map((r) => [r.studentId, r.totalXp]));
  const rankOf = (id: string) => rankForXp(allTimeXp.get(id) ?? 0).current;

  const me = user ? rows.find((r) => r.studentId === user.id) : undefined;
  const podium = rows.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderRow[];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 text-zinc-900 dark:text-white">
      {/* ── Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-950 via-[#2a0509] to-[#7a0c17] text-white p-6 sm:p-8 shadow-xl shadow-red-950/30"
      >
        <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 rounded-full bg-red-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 left-[40%] w-24 h-[170%] bg-gradient-to-b from-white/[0.06] to-transparent rotate-[25deg]" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
              <UsersIcon className="w-3.5 h-3.5" /> {selectedBatch.name}
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-1">Leaderboard</h1>
            <p className="text-sm text-white/60 mt-2">
              {scope === 'weekly' ? 'This week’s race resets every Monday.' : 'Every XP your batch has ever earned.'}
            </p>

            {batches.length > 1 && (
              <label className="relative mt-4 block max-w-sm">
                <span className="sr-only">Choose a batch leaderboard</span>
                <select
                  value={selectedBatchId}
                  onChange={(event) => setSelectedBatchId(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-white/15 bg-white/10 py-2 pl-4 pr-10 text-sm font-bold text-white outline-none transition-colors hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/70 [&>option]:text-zinc-900"
                >
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}{batch.examYear ? ` · ${batch.examYear} ${batch.program}` : ` · ${batch.program}`}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              </label>
            )}

            <div className="inline-flex mt-5 rounded-full bg-white/10 p-1 backdrop-blur-sm">
              {(['weekly', 'all_time'] as Scope[]).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    scope === sc ? 'bg-white text-zinc-900 shadow' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {sc === 'weekly' ? 'This Week' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.07] border border-white/10 px-5 py-4 backdrop-blur-sm">
            {user && <RankEmblem rankKey={rankOf(user.id).key} size={60} className="-my-2" />}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Your position</p>
              <p className="text-3xl font-black tabular-nums leading-none mt-1">{me ? `#${me.position}` : '—'}</p>
              <p className="text-xs text-white/60 mt-1">
                {me ? `${me.totalXp.toLocaleString()} XP ${scope === 'weekly' ? 'this week' : 'total'}` : 'Earn XP to join the board'}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {rows.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 p-12 text-center shadow-sm">
          <TrophyIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="font-bold">{scope === 'weekly' ? `No one in ${selectedBatch.name} has earned XP this week yet` : `No XP earned in ${selectedBatch.name} yet`}</p>
          <p className="text-sm text-zinc-500 mt-1">Finish a quiz to take the top spot.</p>
        </div>
      ) : (
        <>
          {/* ── Podium ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 px-4 sm:px-8 pt-8 shadow-sm overflow-hidden"
          >
            <div className="flex items-end justify-center gap-3 sm:gap-8">
              {podiumOrder.map((r) => {
                const place = Math.min(r.position, 3) as 1 | 2 | 3;
                const style = PODIUM[place];
                const isMe = r.studentId === user?.id;
                const rank = rankOf(r.studentId);
                return (
                  <div key={r.studentId} className="flex flex-col items-center w-24 sm:w-40">
                    <div className="relative mb-3">
                      {place === 1 && <CrownIcon className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400 fill-yellow-300" />}
                      <div className={`rounded-full ring-4 ${style.ring} shadow-xl ${style.glow}`}>
                        <Avatar row={r} size={place === 1 ? 'w-20 h-20 sm:w-24 sm:h-24 text-3xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-2xl'} />
                      </div>
                      <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-zinc-900 bg-gradient-to-br ${style.badge} px-2 py-0.5 rounded-full shadow`}>
                        {style.label}
                      </span>
                    </div>
                    <p className={`text-sm font-bold text-center truncate max-w-full ${isMe ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {isMe ? 'You' : r.displayName}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <RankEmblem rankKey={rank.key} size={22} />
                      <span className="text-[11px] text-zinc-500">{rank.name}</span>
                    </div>
                    <p className="text-sm font-black tabular-nums mt-1">{r.totalXp.toLocaleString()} <span className="text-[10px] text-zinc-400 font-bold">XP</span></p>
                    <div className={`mt-3 w-full ${style.height} rounded-t-2xl bg-gradient-to-b ${
                      place === 1 ? 'from-red-500 to-red-700' : place === 2 ? 'from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700' : 'from-amber-500 to-amber-700'
                    } flex items-start justify-center pt-2`}>
                      <span className="text-2xl font-black text-white/90">{place}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Complete standings, including the podium, so every rank appears in one list. */}
          {rows.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
              className="rounded-3xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden"
            >
              <header className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-6">
                <div>
                  <h2 className="font-bold">Full student rankings</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Every student in {selectedBatch.name} on the {scope === 'weekly' ? 'weekly' : 'all-time'} XP board</p>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-400">{rows.length} {rows.length === 1 ? 'student' : 'students'}</span>
              </header>
              {rows.map((r) => <Row key={r.studentId} row={r} isMe={r.studentId === user?.id} rank={rankOf(r.studentId)} scope={scope} />)}
            </motion.section>
          )}
        </>
      )}
    </div>
  );
}

function Row({ row, isMe, rank, scope }: { row: LeaderRow; isMe: boolean; rank: { key: string; name: string }; scope: Scope }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors ${
      isMe ? 'bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/30' : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40'
    }`}>
      <span className="w-8 text-center text-sm font-black text-zinc-400 tabular-nums">{row.position}</span>
      <Avatar row={row} size="w-10 h-10 text-base" />
      <div className="flex-1 min-w-0">
        <p className={`font-bold truncate ${isMe ? 'text-red-600 dark:text-red-400' : ''}`}>
          {row.displayName}
          {isMe && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-red-600 px-2 py-0.5 rounded-full align-middle">You</span>}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <RankEmblem rankKey={rank.key} size={20} />
          <span className="text-xs text-zinc-500">{rank.name}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black tabular-nums">{row.totalXp.toLocaleString()}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-end gap-1">
          {scope === 'weekly' && <FlameIcon className="w-3 h-3" />} XP
        </p>
      </div>
    </div>
  );
}
