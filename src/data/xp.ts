import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Reads for the gamification system. Everything here is read-only by
 * design: XP is written exclusively by database triggers, and RLS gives
 * students no insert path at all.
 *
 * Every call fails soft. Until `supabase/migration_gamification_v1.sql`
 * has been run these RPCs don't exist, and the dashboard should simply
 * show no XP rather than throw.
 */

export type XpEntry = {
  id: string;
  amount: number;
  sourceType: string;
  reason: string;
  createdAt: string;
};

export type LeaderRow = {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  totalXp: number;
  position: number;
};

export type StudentBatch = {
  id: string;
  name: string;
  program: string;
  examYear: number | null;
};

/** Batches the signed-in student is enrolled in, ordered newest cohort first. */
export async function loadMyBatches(studentId: string): Promise<StudentBatch[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from('batch_members')
    .select('batch_id')
    .eq('student_id', studentId);

  if (membershipsError || !memberships?.length) return [];

  const batchIds = [...new Set(memberships.map((membership: any) => membership.batch_id))];
  const { data, error } = await supabase
    .from('batches')
    .select('id, name, program, exam_year')
    .in('id', batchIds);

  if (error || !data) return [];
  return data
    .map((batch: any) => ({
      id: batch.id,
      name: batch.name,
      program: batch.program,
      examYear: batch.exam_year == null ? null : Number(batch.exam_year)
    }))
    .sort((a, b) => (b.examYear ?? 0) - (a.examYear ?? 0) || a.name.localeCompare(b.name));
}

/** XP standings for one enrolled batch. The RPC enforces membership server-side. */
export async function loadBatchLeaderboard(
  batchId: string,
  scope: 'all_time' | 'weekly' = 'all_time',
  limit = 20
): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc('xp_batch_leaderboard', {
    p_batch_id: batchId,
    p_scope: scope,
    p_limit: limit
  });

  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    studentId: r.student_id,
    displayName: r.display_name ?? 'Student',
    avatarUrl: r.avatar_url ?? undefined,
    totalXp: r.total_xp ?? 0,
    position: r.rank_position ?? 0
  }));
}

/** The signed-in student's lifetime XP. Returns 0 if unavailable. */
export async function loadMyXp(): Promise<number> {
  const { data, error } = await supabase.rpc('my_xp');
  if (error || data == null) return 0;
  return Number(data) || 0;
}

/** Recent XP awards, newest first — the "why do I have this much XP?" feed. */
export async function loadXpFeed(studentId: string, limit = 20): Promise<XpEntry[]> {
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('id, amount, source_type, reason, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    amount: r.amount,
    sourceType: r.source_type,
    reason: r.reason,
    createdAt: r.created_at
  }));
}

/**
 * Leaderboard for the student's current batch. Scoping happens in the
 * database function, not here — it must not be a client-side filter.
 */
export async function loadLeaderboard(
  scope: 'all_time' | 'weekly' = 'all_time',
  limit = 20
): Promise<LeaderRow[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const batches = await loadMyBatches(authData.user.id);
  if (!batches.length) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('program, exam_year')
    .eq('id', authData.user.id)
    .maybeSingle();
  const currentBatch = batches.find((batch) =>
    batch.examYear === Number(profile?.exam_year) && batch.program === profile?.program
  ) ?? batches[0];

  return loadBatchLeaderboard(currentBatch.id, scope, limit);
}

/** XP earned since the start of this week — the weekly leaderboard metric. */
export async function loadWeeklyXp(studentId: string): Promise<number> {
  const monday = new Date();
  const day = (monday.getDay() + 6) % 7; // Monday = 0
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('xp_transactions')
    .select('amount')
    .eq('student_id', studentId)
    .gte('created_at', monday.toISOString());

  if (error || !data) return 0;
  return (data as any[]).reduce((sum, r) => sum + (r.amount ?? 0), 0);
}

/**
 * The rows around the student, so someone in 42nd place sees a reachable
 * target instead of a discouraging absolute number. Returns the caller's
 * own row plus `radius` rows either side.
 */
export function sliceAroundMe(rows: LeaderRow[], studentId: string, radius = 2): LeaderRow[] {
  const idx = rows.findIndex((r) => r.studentId === studentId);
  if (idx === -1) return rows.slice(0, radius * 2 + 1);
  const start = Math.max(0, idx - radius);
  return rows.slice(start, start + radius * 2 + 1);
}

/* ── Paper leaderboard ───────────────────────────────────────────────
   Full and timing boards rank the newest shared paper of that type. Overall
   keeps the historical average. See migration_paper_leaderboard_type_latest.sql. */

export type PaperType = 'full' | 'timing' | 'all';

export type PaperLeaderRow = {
  studentId: string;
  studentCode?: string;
  displayName: string;
  avatarUrl?: string;
  avgPct: number;
  bestPct: number;
  papers: number;
  position: number;
  latestPaperTitle?: string;
  latestPaperDate?: string;
};

export async function loadPaperLeaderboard(type: PaperType = 'all', limit = 50): Promise<PaperLeaderRow[]> {
  const { data, error } = await supabase.rpc('paper_leaderboard', { p_type: type, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    studentId: r.student_id,
    studentCode: r.student_code ?? undefined,
    displayName: r.display_name ?? 'Student',
    avatarUrl: r.avatar_url ?? undefined,
    avgPct: Number(r.avg_pct) || 0,
    bestPct: Number(r.best_pct) || 0,
    papers: r.papers_count ?? 0,
    position: r.rank_position ?? 0,
    latestPaperTitle: r.latest_paper_title ?? undefined,
    latestPaperDate: r.latest_paper_date ?? undefined
  }));
}
