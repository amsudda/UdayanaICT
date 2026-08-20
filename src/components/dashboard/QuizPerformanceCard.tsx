import { useEffect, useState } from 'react';
import { ClipboardListIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';
import { useNavigate } from 'react-router-dom';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function QuizPerformanceCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function load() {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*, quiz:quizzes(title)')
        .eq('student_id', user!.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5);
        
      setAttempts(data || []);
      setLoading(false);
    }
    
    load();
  }, [user]);

  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader>
        <DashboardCardTitle icon={ClipboardListIcon}>Recent Quizzes</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : attempts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No quizzes completed yet.</div>
        ) : (
          <div className="space-y-3">
            {attempts.map((qa) => (
              <div
                key={qa.id}
                onClick={() => navigate(`/dashboard/quizzes/${qa.quiz_id}/result?attempt_id=${qa.id}`)}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {qa.quiz?.title || 'Unknown Quiz'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(qa.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <span className={`inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-lg ${
                    qa.passed 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {qa.percentage}%
                  </span>
                  <p className="text-[10px] font-medium text-slate-500 mt-1">
                    {qa.score}/{qa.total_marks} marks
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCardContent>
    </DashboardCard>
  );
}
