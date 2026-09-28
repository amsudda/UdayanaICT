import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CrownIcon, FileTextIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { loadPaperLeaderboard, type PaperLeaderRow, type PaperType } from '../../data/xp';

/**
 * The batch ranked on paper marks, built as a tall board for the right
 * rail rather than a wide card.
 *
 * Shape follows the column it lives in: one row per student, the leader's
 * average setting the length of every bar beneath it, so the gap between
 * places is something you see rather than something you work out.
 *
 * Full and timing papers stay separate boards — a 30-minute drill and a
 * three-hour paper are different tests, and one average across both
 * describes neither.
 */

const MEDAL: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950',
  2: 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-800',
  3: 'bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50'
};

export function PaperRankBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // 'all' first: most students have sat a mix, and a board that opens on
  // full papers only looks empty to anyone whose batch has done timing ones.
  const [type, setType] = useState<PaperType>('all');
  const [rows, setRows] = useState<PaperLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const data = await loadPaperLeaderboard(type, 50);
      if (!active) return;
      setRows(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [type]);

  const myIndex = user ? rows.findIndex((r) => r.studentId === user.id) : -1;
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const top = rows.slice(0, 5);
  // One row either side, so the student sees a place they can actually take.
  const nearMe = myIndex > 4 ? rows.slice(Math.max(0, myIndex - 1), myIndex + 2) : [];
  const leader = rows[0]?.avgPct || 100;

  const Row = ({ r }: { r: PaperLeaderRow }) => {
    const isMe = user?.id === r.studentId;
    const medal = MEDAL[r.position];
    return (
      <div className={`relative px-3 py-2.5 rounded-2xl transition-colors ${
        isMe ? 'bg-[#c20f24]/[0.07] ring-1 ring-[#c20f24]/25' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-black tabular-nums ${
            medal || 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            {r.position}
          </span>

          {r.avatarUrl ? (
            <img src={r.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-7 h-7 rounded-full shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center justify-center">
              {r.displayName.charAt(0).toUpperCase()}
            </span>
          )}

          <span className={`flex-1 min-w-0 truncate text-[13px] ${
            isMe ? 'font-bold text-[#c20f24]' : 'font-medium text-slate-700 dark:text-slate-300'
          }`}>
            {isMe ? 'You' : r.displayName}
          </span>

          <span className="text-[13px] font-black tabular-nums text-slate-900 dark:text-white shrink-0">
            {r.avgPct.toFixed(1)}%
          </span>
        </div>

        {/* measured against the leader, not against 100 */}
        <div className="mt-1.5 ml-[2.4rem] h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(4, (r.avgPct / leader) * 100)}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full ${isMe ? 'bg-[#c20f24]' : r.position === 1 ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'}`}
          />
        </div>
      </div>
    );
  };

  const tabCls = (active: boolean) =>
    `flex-1 h-7 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
      active ? 'bg-white text-zinc-900 shadow-sm' : 'text-white/60 hover:text-white'
    }`;

  return (
    <section className="rounded-3xl overflow-hidden bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
      {/* ── Head: dark, so the board reads as its own thing in the rail ── */}
      <div className="relative bg-gradient-to-br from-zinc-950 via-[#2a0509] to-[#7a0c17] px-5 pt-5 pb-4 text-white">
        <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-red-600/25 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <FileTextIcon className="w-4 h-4 text-white/60" />
          <h3 className="font-bold text-[15px] tracking-tight">Paper Ranking</h3>
        </div>

        <div className="relative flex gap-1 mt-3 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
          <button type="button" className={tabCls(type === 'full')} onClick={() => setType('full')}>Full</button>
          <button type="button" className={tabCls(type === 'timing')} onClick={() => setType('timing')}>Timing</button>
          <button type="button" className={tabCls(type === 'all')} onClick={() => setType('all')}>All</button>
        </div>

        {/* Their own standing, in the head where it cannot be missed */}
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Your position</p>
            <p className="text-3xl font-black tabular-nums leading-none mt-1">
              {me ? `#${me.position}` : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">{me ? `${me.avgPct.toFixed(1)}%` : 'No marks'}</p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {me ? `best ${me.bestPct.toFixed(0)}% · ${me.papers} paper${me.papers === 1 ? '' : 's'}` : 'sit a paper to join'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <div className="p-2.5 flex-1">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <CrownIcon className="w-8 h-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No marks yet</p>
            <p className="text-xs text-slate-400 mt-1">
              {type === 'timing' ? 'No timing papers' : 'No papers'} marked in your batch.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-0.5">
              {top.map((r) => <Row key={r.studentId} r={r} />)}
            </div>

            {nearMe.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-2 px-3">
                  <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">Around you</span>
                  <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-0.5">
                  {nearMe.map((r) => <Row key={r.studentId} r={r} />)}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard/papers')}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-[#c20f24] hover:bg-[#c20f24]/[0.06] rounded-xl transition-colors"
            >
              My papers <ArrowRightIcon className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
