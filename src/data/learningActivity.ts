import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A "learning day" is any day the student logged study time (study_logs,
 * hours > 0) or submitted an AQuiz. Everything streak-related on the
 * dashboard is derived from this one set of days, so the numbers agree.
 */

/** Local-time YYYY-MM-DD, so a day matches the calendar the student sees. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export type LearningActivity = {
  activeDays: Set<string>;
  /** Consecutive learning days up to today. Not broken until today ends. */
  streak: number;
  best: number;
  daysThisMonth: number;
  loading: boolean;
};

export function useLearningActivity(studentId?: string): LearningActivity {
  const [state, setState] = useState<LearningActivity>({
    activeDays: new Set(), streak: 0, best: 0, daysThisMonth: 0, loading: true
  });

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    (async () => {
      const since = dayKey(addDays(new Date(), -400));
      const [logs, quizzes] = await Promise.all([
        supabase.from('study_logs').select('log_date, hours').eq('student_id', studentId).gte('log_date', since),
        supabase.from('quiz_attempts').select('submitted_at').eq('student_id', studentId).eq('status', 'submitted')
      ]);

      const days = new Set<string>();
      for (const r of (logs.data ?? []) as any[]) {
        if (Number(r.hours) > 0 && r.log_date) days.add(String(r.log_date).slice(0, 10));
      }
      for (const r of (quizzes.data ?? []) as any[]) {
        if (r.submitted_at) days.add(dayKey(new Date(r.submitted_at)));
      }

      // current streak: today counts if active; otherwise the streak is still
      // alive from yesterday until the day is over
      const today = new Date();
      let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
      let streak = 0;
      while (days.has(dayKey(cursor))) {
        streak++;
        cursor = addDays(cursor, -1);
      }

      // best streak: longest run of consecutive days
      const sorted = [...days].sort();
      let best = 0;
      let run = 0;
      let prev: string | null = null;
      for (const k of sorted) {
        run = prev && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === k ? run + 1 : 1;
        best = Math.max(best, run);
        prev = k;
      }

      const monthPrefix = dayKey(today).slice(0, 7);
      const daysThisMonth = sorted.filter((k) => k.startsWith(monthPrefix)).length;

      if (!active) return;
      setState({ activeDays: days, streak, best: Math.max(best, streak), daysThisMonth, loading: false });
    })();
    return () => { active = false; };
  }, [studentId]);

  return state;
}

/** Monday..Sunday of the current week as Date objects. */
export function currentWeek(): Date[] {
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
