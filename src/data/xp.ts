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
 * Leaderboard for the caller's own batches. Scoping happens in the
 * database function, not here — it must not be a client-side filter.
 */
export async function loadLeaderboard(
  scope: 'all_time' | 'weekly' = 'all_time',
  limit = 20
): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc('xp_leaderboard', { p_scope: scope, p_limit: limit });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    studentId: r.student_id,
    displayName: r.display_name ?? 'Student',
    avatarUrl: r.avatar_url ?? undefined,
    totalXp: r.total_xp ?? 0,
    position: r.rank_position ?? 0
  }));
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
