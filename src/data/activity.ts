import { supabase } from '../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-side records of what a student actually did: which lessons they
 * finished and which sheets they took. XP is paid by database triggers
 * off these rows (see migration_gamification_activity_v1.sql) — nothing
 * here awards anything itself.
 *
 * Every call fails soft and silently. Watching a video must never break
 * because the student is offline or the migration hasn't been run.
 */

/**
 * Marks a lesson finished. Called when the player reports the video
 * ended, not when the student ticks the box, so the XP behind it means
 * something. Safe to call repeatedly: the row is unique per student and
 * video, and the trigger only pays on the first flip to watched.
 */
export async function markLessonWatched(videoId: string, watchedSeconds = 0): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const studentId = auth?.user?.id;
  if (!studentId || !videoId) return;

  await supabase
    .from('progress')
    .upsert(
      {
        student_id: studentId,
        video_id: videoId,
        is_watched: true,
        watched_seconds: Math.max(0, Math.round(watchedSeconds)),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'student_id,video_id' }
    );
}

export type ResourceKind = 'homework' | 'tute' | 'paper';

/**
 * Logs that a student opened a sheet. The unique constraint makes the
 * second download a no-op, so re-downloading never pays twice.
 */
export async function recordDownload(kind: ResourceKind, resourceId: string, title?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const studentId = auth?.user?.id;
  if (!studentId || !resourceId) return;

  await supabase
    .from('resource_downloads')
    .insert({ student_id: studentId, resource_type: kind, resource_id: resourceId, title: title ?? null });
}
