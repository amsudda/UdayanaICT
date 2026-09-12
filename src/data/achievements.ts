import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The achievement catalogue plus which of them a student has unlocked.
 *
 * Locked achievements are deliberately fetched too — seeing what is still
 * ahead is the whole point of the journey. Unlocking is decided in the
 * database (`evaluate_achievements`); nothing here can grant anything.
 *
 * Fails soft: until the achievements migration has been run this returns
 * an empty list rather than throwing.
 */
export type Achievement = {
  key: string;
  name: string;
  description: string;
  tier: string;
  xp: number;
  sortOrder: number;
  unlocked: boolean;
  unlockedAt?: string;
};

export async function loadAchievements(studentId: string): Promise<Achievement[]> {
  const [catalogue, mine] = await Promise.all([
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('student_achievements').select('achievement_key, unlocked_at').eq('student_id', studentId)
  ]);

  if (catalogue.error || !catalogue.data) return [];

  const unlockedAt = new Map<string, string>();
  for (const row of (mine.data ?? []) as any[]) {
    unlockedAt.set(row.achievement_key, row.unlocked_at);
  }

  return (catalogue.data as any[]).map((a) => ({
    key: a.key,
    name: a.name,
    description: a.description,
    tier: a.tier,
    xp: a.xp ?? 50,
    sortOrder: a.sort_order ?? 0,
    unlocked: unlockedAt.has(a.key),
    unlockedAt: unlockedAt.get(a.key)
  }));
}
