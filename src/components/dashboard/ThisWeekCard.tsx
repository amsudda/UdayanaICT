import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, TrophyIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { loadLeaderboard, type LeaderRow } from '../../data/xp';

type Scope = 'weekly' | 'all_time';

/**
 * Compact batch leaderboard for the dashboard. Shows the top three; if the
 * student isn't among them, their own row takes the third slot so they can
 * always see where they stand.
 */
export function ThisWeekCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('weekly');
  const [rows, setRows] = useState<Record<Scope, LeaderRow[] | null>>({ weekly: null, all_time: null });

  useEffect(() => {
    if (!user || rows[scope]) return;
    let active = true;
    loadLeaderboard(scope, 50).then((data) => {
      if (active) setRows((prev) => ({ ...prev, [scope]: data }));
    });
    return () => { active = false; };
  }, [user, scope, rows]);

  const list = rows[scope];
  let shown: LeaderRow[] = [];
  if (list) {
    shown = list.slice(0, 3);
    const me = user ? list.find((r) => r.studentId === user.id) : undefined;
    if (me && !shown.some((r) => r.studentId === me.studentId)) {
      shown = [...list.slice(0, 2), me];
    }
  }

  const medal = (pos: number) =>
    pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-zinc-400' : pos === 3 ? 'text-amber-600' : 'text-zinc-400';

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-[15px]">{scope === 'weekly' ? 'This Week' : 'All Time'}</h2>
        </div>
        <button
          onClick={() => navigate('/dashboard/leaderboard')}
          className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
        >
          View All <ArrowRightIcon className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-4 text-[11px] font-bold text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-3">
        {(['weekly', 'all_time'] as Scope[]).map((sc) => (
          <button
            key={sc}
            onClick={() => setScope(sc)}
            className={`pb-2 -mb-[9px] border-b-2 transition-colors ${
              scope === sc ? 'text-red-500 border-red-500' : 'border-transparent hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {sc === 'weekly' ? 'THIS WEEK' : 'ALL TIME'}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2.5">
        {!list ? (
          [0, 1, 2].map((i) => <div key={i} className="h-6 rounded-md bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />)
        ) : shown.length === 0 ? (
          <p className="text-[11px] text-zinc-500 pt-2">
            {scope === 'weekly' ? 'No XP earned in your batch this week yet.' : 'No XP earned in your batch yet.'}
          </p>
        ) : (
          shown.map((r) => {
            const isMe = r.studentId === user?.id;
            return (
              <div
                key={r.studentId}
                className={`flex items-center justify-between text-xs rounded-lg ${isMe ? 'bg-red-50 dark:bg-red-950/30 -mx-2 px-2 py-1' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-4 text-center font-bold tabular-nums ${medal(r.position)}`}>{r.position}</span>
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      {r.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className={`truncate max-w-[110px] ${isMe ? 'font-bold text-red-600 dark:text-red-400' : 'font-medium'}`}>
                    {isMe ? 'You' : r.displayName}
                  </span>
                </div>
                <span className="font-bold text-zinc-600 dark:text-zinc-300 tabular-nums shrink-0">{r.totalXp.toLocaleString()} XP</span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
