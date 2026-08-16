import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardContent } from './DashboardCard';
import { BookOpenIcon, TargetIcon, AwardIcon } from 'lucide-react';
import type { Mark } from '../shared/MarksChart';

interface WelcomeCardProps {
  marks?: Mark[];
}

export function WelcomeCard({ marks = [] }: WelcomeCardProps) {
  const { user } = useAuth();
  const name = user?.name || 'there';

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

        {/* Quick Stats to fill space beautifully */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 sm:mt-12">
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
