import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared reads for the student quiz flow.
 *
 * Three things the pages kept getting wrong on their own, now in one place:
 *
 *  1. Section headings are rows in quiz_questions, so anything that counts
 *     or numbers questions has to skip them.
 *  2. Students read questions through quiz_questions_safe, never the base
 *     table — the base table carries the correct answer.
 *  3. A student can have more than one attempt at a quiz. `.maybeSingle()`
 *     errors on the second row, which made pages behave as if there were
 *     no attempt at all, so a finished quiz offered itself as new.
 */

export type QuizQuestion = {
  id: string;
  kind?: string;
  question_text?: string;
  image_url?: string | null;
  section_title?: string | null;
  section_note?: string | null;
  options?: { id: string; text: string }[];
  marks?: number;
  order_index?: number;
  [key: string]: any;
};

export const isSection = (q: any): boolean => q?.kind === 'section';

/** Questions a student must actually answer. */
export const answerable = (rows: any[]): QuizQuestion[] => (rows || []).filter((q) => !isSection(q));

const byOrder = (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0);

/**
 * Every row of a quiz, headings included, in the teacher's order.
 * Reads the safe view, which omits the correct answer.
 */
export async function loadQuizRows(quizId: string): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions_safe')
    .select('*')
    .eq('quiz_id', quizId);

  if (error || !data) return [];
  return [...data].sort(byOrder);
}

/** How many real questions a quiz has, and what they add up to. */
export async function loadQuizShape(quizId: string): Promise<{ count: number; totalMarks: number }> {
  const rows = answerable(await loadQuizRows(quizId));
  return {
    count: rows.length,
    totalMarks: rows.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
  };
}

/**
 * The student's attempt at a quiz, newest first.
 *
 * `maybeSingle()` throws once a second attempt exists, so this orders and
 * takes one row instead. An unfinished attempt always wins over a finished
 * one, otherwise a student mid-quiz would be sent to an old result.
 */
export async function loadAttempt(
  quizId: string,
  studentId: string,
  status?: 'in_progress' | 'submitted'
): Promise<any | null> {
  let query = supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId);

  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('started_at', { ascending: false }).limit(20);
  if (error || !data?.length) return null;
  if (status) return data[0];
  return data.find((a: any) => a.status === 'in_progress') ?? data[0];
}

/** Picks the attempt to show for each quiz in a list, by the same rule. */
export function pickAttempt(rows: any[]): any | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort(
    (a, b) => new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
  );
  return sorted.find((a) => a.status === 'in_progress') ?? sorted[0];
}

/**
 * The pass mark, as a percentage.
 *
 * The column has been spelled three ways across this codebase's history
 * and the live database only answers to one of them, so read all three
 * rather than show every student a pass mark of 0.
 */
export function passMarkOf(quiz: any): number {
  const v = quiz?.pass_mark_percentage ?? quiz?.pass_mark_percent ?? quiz?.passing_marks;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
