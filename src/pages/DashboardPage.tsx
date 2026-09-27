import { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { ExamCountdownCard } from '../components/dashboard/ExamCountdownCard';

import { NoticesCard } from '../components/dashboard/NoticesCard';
import { PaperRankBoard } from '../components/dashboard/PaperRankBoard';
import { StudyTimeCard } from '../components/shared/StudyTimeCard';
import { MarksChart, type Mark } from '../components/shared/MarksChart';
import { QuizPerformanceCard } from '../components/dashboard/QuizPerformanceCard';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from '../components/dashboard/DashboardCard';
import { TrendingUpIcon } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const [marks, setMarks] = useState<Mark[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: mk } = await supabase.from('paper_marks').select('*').eq('student_id', user.id);
    setMarks((mk ?? []) as Mark[]);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.08 } } };
  const item = reduce ? { hidden: { opacity: 1 }, show: { opacity: 1 } } : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="w-full pb-10">

      {/* Two columns: the student's own work on the left, the standing
          board and notices in a rail down the right. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">

        {/* ── Main column ── */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <motion.div variants={item}>
            <WelcomeCard marks={marks} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

          <motion.div variants={item}>
            <StudyTimeCard />
          </motion.div>
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-6 lg:w-[340px]">
          <motion.div variants={item}>
            <ExamCountdownCard />
          </motion.div>
          <motion.div variants={item}>
            <PaperRankBoard />
          </motion.div>
          <motion.div variants={item}>
            <NoticesCard />
          </motion.div>
        </aside>
      </div>

    </motion.div>
  );
}
