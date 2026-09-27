import { supabase } from './supabase';

/**
 * Uploads for the quiz builder — question images and quiz banners.
 *
 * The bucket is public (see migration_quiz_forms.sql), so the returned
 * URL can be stored on the row and rendered directly; a signed URL per
 * question would add a round trip to every question a student opens.
 */

const BUCKET = 'quiz-images';
const MAX_BYTES = 8 * 1024 * 1024;

export type UploadResult = { url: string } | { error: string };

export async function uploadQuizImage(file: File, quizId: string): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) return { error: 'That file is not an image.' };
  if (file.size > MAX_BYTES) return { error: 'Images must be under 8MB.' };

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${quizId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { error: error.message };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

/**
 * Removes an image from storage. Failure is ignored on purpose: a file
 * left behind is harmless, but blocking a teacher from deleting a
 * question because storage hiccupped is not.
 */
export async function deleteQuizImage(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return;
  const path = url.slice(at + marker.length).split('?')[0];
  await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
}
