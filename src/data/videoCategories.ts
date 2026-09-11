/**
 * Categories for class videos, stored in `theory_videos.kind`.
 *
 * `paper` predates this file and keeps its value, so every video already
 * tagged as a paper discussion becomes "Paper Discussion" with no data
 * migration. Array order is the order sections appear on the course page.
 */
export type VideoKind = 'lesson' | 'question_book' | 'paper';

export const VIDEO_KINDS: { key: VideoKind; label: string; short: string }[] = [
  { key: 'lesson', label: 'Lesson', short: 'Lesson' },
  { key: 'question_book', label: 'Question Book Discussion', short: 'Question Book' },
  { key: 'paper', label: 'Paper Discussion', short: 'Paper' }
];

/**
 * The single place a raw `kind` becomes a VideoKind. Anything unrecognised —
 * including rows with no `kind` at all, like pack videos — is a lesson.
 */
export function toVideoKind(value: unknown): VideoKind {
  return value === 'question_book' || value === 'paper' ? value : 'lesson';
}

export function videoKindLabel(kind: VideoKind, form: 'label' | 'short' = 'label'): string {
  return (VIDEO_KINDS.find((k) => k.key === kind) ?? VIDEO_KINDS[0])[form];
}
