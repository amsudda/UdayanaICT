/**
 * Pull the 11-char YouTube video ID out of whatever the admin pasted:
 * a bare ID, a share link (youtu.be/ID?si=...), watch?v=, embed/, shorts/,
 * live/, or a bare ID with tracking junk appended ("ID?si=...").
 * Falls back to the input untouched if nothing matches.
 */
export function extractYouTubeId(input: string): string {
  const s = (input ?? '').trim();
  const url = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\bv=)([A-Za-z0-9_-]{11})/);
  if (url) return url[1];
  const bare = s.match(/^([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/);
  if (bare) return bare[1];
  return s;
}
