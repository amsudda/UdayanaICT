import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardContent } from './DashboardCard';
import { BookOpenIcon, TargetIcon, AwardIcon, ChevronRightIcon } from 'lucide-react';
import { loadMyXp } from '../../data/xp';
import { rankForXp } from '../../data/ranks';
import { RankEmblem } from '../achievements/AchievementBadge';
import type { Mark } from '../shared/MarksChart';

interface WelcomeCardProps {
  marks?: Mark[];
}

export function WelcomeCard({ marks = [] }: WelcomeCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || 'there';
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadMyXp().then((v) => { if (active) setXp(v); });
    return () => { active = false; };
  }, [user]);

  const rp = rankForXp(xp);

  // Calculate accurate stats based on the student's marks
  const completedPapers = marks.length;
  const avgScore = completedPapers > 0 
    ? Math.round(marks.reduce((sum, m) => sum + m.marks, 0) / completedPapers)
    : 0;
  
  // For now, we assume at least 1 enrolled class if they are logged in
  const enrolledClasses = 1;

  return (
    <DashboardCard className="relative overflow-hidden bg-white dark:bg-slate-900 border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] h-full flex flex-col">
      {/* Subtle red background glow to match user preference */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_top_right,rgba(194,15,36,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(194,15,36,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(194,15,36,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgba(194,15,36,0.1),transparent_50%)] pointer-events-none" />

      <DashboardCardContent className="relative z-10 p-7 sm:p-10 flex flex-col flex-1">
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-auto">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[#c20f24] dark:text-red-400 mb-2">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-white tracking-tight mb-2">
              Hi, {name} <span className="inline-block origin-[70%_70%] hover:animate-waving-hand">👋</span>
            </h1>
            <p className="text-[15px] text-[#64748B] dark:text-slate-400 max-w-md leading-relaxed">
              Continue your learning journey and stay on track with your classes.
            </p>
          </div>

          <div className="shrink-0 bg-[#F8FAFC]/80 backdrop-blur-sm dark:bg-slate-800/50 border border-[#E5EAF2] dark:border-slate-700 rounded-[18px] p-5 w-full sm:w-auto text-left sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B] dark:text-slate-400 mb-1">Student ID</p>
            <p className="text-xl sm:text-2xl font-black text-[#172033] dark:text-white tracking-wide">
              {user?.studentId || '—'}
            </p>
          </div>
        </div>

        {/* Rank & XP: deliberately one quiet line; the details live on the Rank page */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/rank')}
          className="group mt-7 w-full flex items-center gap-3 rounded-2xl border border-[#E5EAF2] dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 px-4 py-3 text-left hover:border-red-200 dark:hover:border-red-900/50 transition-colors"
        >
          <RankEmblem rankKey={rp.current.key} size={36} title={rp.current.name} className="-my-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
              <span className="font-bold text-[#172033] dark:text-white truncate">
                {rp.current.name}
                <span className="font-medium text-[#64748B] dark:text-slate-400"> · {xp.toLocaleString()} XP</span>
              </span>
              <span className="text-[#64748B] dark:text-slate-400 font-medium shrink-0">
                {rp.next ? `${rp.xpToNext.toLocaleString()} XP to ${rp.next.name}` : 'Top rank reached'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-[#c20f24] transition-[width] duration-700" style={{ width: `${rp.next ? Math.max(rp.progressPct, 2) : 100}%` }} />
            </div>
          </div>
          <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-[#c20f24] transition-colors shrink-0" />
        </button>

        {/* Quick Stats to fill space beautifully */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 border border-red-50 dark:border-red-900/20 flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors">
            <div className="w-12 h-12 rounded-[14px] bg-red-50 dark:bg-red-500/10 text-[#c20f24] flex items-center justify-center shrink-0 shadow-sm border border-red-100/50 dark:border-transparent">
              <BookOpenIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033] dark:text-white leading-none">{enrolledClasses}</p>
              <p className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 mt-1 uppercase tracking-wider">Enrolled Classes</p>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 border border-blue-50 dark:border-blue-900/20 flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors">
            <div className="w-12 h-12 rounded-[14px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50 dark:border-transparent">
              <TargetIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033] dark:text-white leading-none">{completedPapers}</p>
              <p className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 mt-1 uppercase tracking-wider">Completed Papers</p>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 border border-emerald-50 dark:border-emerald-900/20 flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors">
            <div className="w-12 h-12 rounded-[14px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/50 dark:border-transparent">
              <AwardIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#172033] dark:text-white leading-none">{avgScore > 0 ? `${avgScore}%` : '—'}</p>
              <p className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 mt-1 uppercase tracking-wider">Avg Score</p>
            </div>
          </div>
        </div>

      </DashboardCardContent>
    </DashboardCard>
  );
}
