import { ClockIcon, CalendarIcon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';
import { useEffect, useState } from 'react';

export function ExamCountdownCard() {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [examDateStr, setExamDateStr] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchExamDate = async () => {
      if (!user?.id) return;

      // Fetch the student's batch membership and the exact exam date from the batch
      const { data, error } = await supabase
        .from('batch_members')
        .select('batch:batches ( exam_date, exam_year )')
        .eq('student_id', user.id)
        .limit(1)
        .maybeSingle();
        
      let targetDate: Date | null = null;
      
      const batchData = data?.batch as any;
      if (batchData?.exam_date) {
        targetDate = new Date(batchData.exam_date);
      } else if (batchData?.exam_year || user.examYear) {
        // Fallback if no exact date is set by admin
        const year = batchData?.exam_year || user.examYear;
        targetDate = new Date(`${year}-08-15T00:00:00`);
      }
      
      if (targetDate) {
        const now = new Date();
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysLeft(diffDays > 0 ? diffDays : 0);
        
        setExamDateStr(targetDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }));
      }
    };
    
    fetchExamDate();
  }, [user]);

  return (
    <DashboardCard delay={0.1}>
      <DashboardCardHeader>
        <DashboardCardTitle icon={ClockIcon}>Exam Countdown</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardContent className="flex items-center justify-between gap-6">
        {daysLeft !== null ? (
          <>
            <div className="relative flex items-center justify-center">
              {/* Circular progress visual (decorative) */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                <circle 
                  cx="48" cy="48" r="40" 
                  stroke="currentColor" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={daysLeft > 0 ? (251.2 * (1 - Math.min(daysLeft / 365, 1))) : 0} 
                  className="text-[#c20f24]" 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#172033] dark:text-white leading-none">{daysLeft}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748B] mt-1">Days</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#c20f24]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">Exam Date</p>
                  <p className="text-sm font-semibold text-[#172033] dark:text-white">{examDateStr}</p>
                </div>
              </div>
              <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-3 leading-relaxed">
                Based on the {user?.examYear} A/L examination schedule.
              </p>
            </div>
          </>
        ) : (
          <div className="w-full text-center py-4">
            <ClockIcon className="w-10 h-10 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-[#172033] dark:text-white mb-1">No upcoming exams</h4>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-[200px] mx-auto">Your upcoming examination schedule will appear here.</p>
          </div>
        )}
      </DashboardCardContent>
    </DashboardCard>
  );
}
