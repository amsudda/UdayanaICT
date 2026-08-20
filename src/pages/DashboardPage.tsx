import { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { ExamCountdownCard } from '../components/dashboard/ExamCountdownCard';
import { StudentProgressCard } from '../components/dashboard/StudentProgressCard';

import { NoticesCard } from '../components/dashboard/NoticesCard';
import { StudyTimeCard } from '../components/shared/StudyTimeCard';
import { MarksChart, type Mark } from '../components/shared/MarksChart';
import { QuizPerformanceCard } from '../components/dashboard/QuizPerformanceCard';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from '../components/dashboard/DashboardCard';
import { TrendingUpIcon, WalletIcon, ArrowRightIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatLKR } from '../data/paymentConfig';

export function DashboardPage() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [marks, setMarks] = useState<Mark[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: mk }, { data: pays }] = await Promise.all([
      supabase.from('paper_marks').select('*').eq('student_id', user.id),
      supabase.from('payments').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(4)
    ]);
    setMarks((mk ?? []) as Mark[]);
    setPayments(pays ?? []);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.08 } } };
  const item = reduce ? { hidden: { opacity: 1 }, show: { opacity: 1 } } : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 sm:space-y-8 w-full pb-10">
      
      {/* Row 1: Welcome & Exam Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <motion.div variants={item} className="h-full">
          <WelcomeCard marks={marks} />
        </motion.div>
        <motion.div variants={item} className="h-full">
          <ExamCountdownCard />
        </motion.div>
      </div>

      {/* Row 2: Student Progression */}
      <div className="grid grid-cols-1">
        <motion.div variants={item}>
          <StudentProgressCard />
        </motion.div>
      </div>

      {/* Row 3: Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="h-full">
          <DashboardCard delay={0.2} className="h-full">
            <DashboardCardHeader>
               <DashboardCardTitle icon={TrendingUpIcon}>Paper Performance</DashboardCardTitle>
            </DashboardCardHeader>
            <DashboardCardContent>
              <MarksChart marks={marks} />
            </DashboardCardContent>
          </DashboardCard>
        </motion.div>
        <motion.div variants={item} className="h-full">
          <QuizPerformanceCard />
        </motion.div>
      </div>

      {/* Row 3: Study Time & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <motion.div variants={item}>
          {/* We wrap StudyTimeCard in a DashboardCard layout inside its own component, 
              or we let it handle its own layout if we refactored it. */}
          <StudyTimeCard />
        </motion.div>
        <motion.div variants={item}>
          <NoticesCard />
        </motion.div>
      </div>

      {/* Row 4: Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <motion.div variants={item}>
          <DashboardCard delay={0.5}>
            <DashboardCardHeader>
              <DashboardCardTitle icon={WalletIcon}>Recent Payments</DashboardCardTitle>
              <button onClick={() => navigate('/dashboard/payments')} className="text-[12px] font-semibold text-[#c20f24] hover:underline flex items-center gap-1 shrink-0">
                View all <ArrowRightIcon className="w-3 h-3" />
              </button>
            </DashboardCardHeader>
            <DashboardCardContent className="p-0">
              {payments.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#64748B] dark:text-slate-400">No payments yet.</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-[#172033] dark:text-apple-light mb-0.5 capitalize">{p.kind.replace('_', ' ')}</p>
                        <p className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                          {p.period_month ? `${p.period_month} ${p.period_year}` : new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#172033] dark:text-apple-light mb-1">{formatLKR(p.amount)}</p>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                          p.status === 'approved' || p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          p.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCardContent>
          </DashboardCard>
        </motion.div>
      </div>

    </motion.div>
  );
}
