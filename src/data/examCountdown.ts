import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Days until the signed-in student's A/L exam.
 *
 * Uses the exact exam date the admin set on the student's batch; if none is
 * set, falls back to 15 August of the batch's (or the student's) exam year.
 * Shared by the dashboard countdown card and the sidebar so they always agree.
 */
export function useExamCountdown() {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [examDateStr, setExamDateStr] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from('batch_members')
        .select('batch:batches ( exam_date, exam_year )')
        .eq('student_id', user.id)
        .limit(1);

      const batch = data?.[0]?.batch as any;
      let target: Date | null = null;
      if (batch?.exam_date) {
        target = new Date(batch.exam_date);
      } else if (!batch && (user.role === 'admin' || user.role === 'staff')) {
        // Admins usually aren't in a batch, so preview the soonest upcoming
        // batch exam instead of showing nothing. Students never reach this.
        const { data: next } = await supabase
          .from('batches')
          .select('exam_date')
          .gte('exam_date', new Date().toISOString())
          .order('exam_date', { ascending: true })
          .limit(1);
        if (next?.[0]?.exam_date) target = new Date(next[0].exam_date);
      }
      if (!target && (batch?.exam_year || user.examYear)) {
        target = new Date(`${batch?.exam_year || user.examYear}-08-15T00:00:00`);
      }
      if (!active || !target) return;

      const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setDaysLeft(diffDays > 0 ? diffDays : 0);
      setExamDateStr(target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    })();

    return () => { active = false; };
  }, [user]);

  return { daysLeft, examDateStr };
}
