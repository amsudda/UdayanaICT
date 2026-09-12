import { useEffect, useState } from 'react';
import { UsersIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';
import { loadLeaderboard, sliceAroundMe, type LeaderRow } from '../../data/xp';

/**
 * Leaderboard for the student's own batch.
 *
 * Two deliberate choices, both from the research on educational leaderboards:
 * a weekly board sits alongside the all-time one so a new student always has
 * a winnable race, and someone outside the top few sees the rows immediately
 * around them rather than a demoralising absolute position.
 */
export function LeaderboardCard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<'weekly' | 'all_time'>('weekly');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const data = await loadLeaderboard(scope, 50);
      if (!active) return;
      setRows(data);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [scope]);

  const myIndex = user ? rows.findIndex((r) => r.studentId === user.id) : -1;
  const top = rows.slice(0, 5);
  const nearMe = user && myIndex > 4 ? sliceAroundMe(rows, user.id, 1) : [];

  const tabCls = (active: boolean) =>
    `flex-1 h-7 px-3 rounded-md text-xs font-semibold transition-colors ${
      active ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
             : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  const Row = ({ r }: { r: LeaderRow }) => {
    const isMe = user?.id === r.studentId;
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
          isMe ? 'bg-[#c20f24]/[0.06] border border-[#c20f24]/20' : 'border border-transparent'
        }`}
      >
        <span className={`w-7 text-center text-xs font-black tabular-nums shrink-0 ${
          r.position === 1 ? 'text-yellow-500'
            : r.position === 2 ? 'text-slate-400'
            : r.position === 3 ? 'text-amber-600'
            : 'text-slate-400'
        }`}>
          {r.position}
        </span>
        {r.avatarUrl ? (
          <img src={r.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
            {r.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className={`flex-1 min-w-0 truncate text-sm ${
          isMe ? 'font-bold text-[#c20f24]' : 'font-medium text-slate-700 dark:text-slate-300'
        }`}>
          {isMe ? 'You' : r.displayName}
        </span>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          {r.totalXp.toLocaleString()} XP
        </span>
      </div>
    );
  };

  return (
    <DashboardCard className="h-full" delay={0.2}>
      <DashboardCardHeader>
        <DashboardCardTitle icon={UsersIcon}>Leaderboard</DashboardCardTitle>
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 w-[160px]">
          <button type="button" className={tabCls(scope === 'weekly')} onClick={() => setScope('weekly')}>
            This Week
          </button>
          <button type="button" className={tabCls(scope === 'all_time')} onClick={() => setScope('all_time')}>
            All Time
          </button>
        </div>
      </DashboardCardHeader>

      <DashboardCardContent className="p-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No XP earned in your batch yet.
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {top.map((r) => <Row key={r.studentId} r={r} />)}
            </div>

            {nearMe.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-2 px-3">
                  <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Around you</span>
                  <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  {nearMe.map((r) => <Row key={r.studentId} r={r} />)}
                </div>
              </>
            )}
          </>
        )}
      </DashboardCardContent>
    </DashboardCard>
  );
}
