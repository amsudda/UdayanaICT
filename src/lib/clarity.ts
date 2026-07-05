/**
 * Microsoft Clarity — student behaviour analytics (heatmaps, session
 * recordings). Loads only when VITE_CLARITY_ID is set, so local dev and
 * preview builds never pollute the real data.
 */
const CLARITY_PROJECT_ID = 'xhxanu4gvv';

export function initClarity() {
  // production only (override/disable via VITE_CLARITY_ID) — keeps dev sessions out of the data
  const id = (import.meta.env.VITE_CLARITY_ID as string | undefined) ?? (import.meta.env.PROD ? CLARITY_PROJECT_ID : undefined);
  if (!id) return;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any;
  w.clarity = w.clarity || function (...args: any[]) { (w.clarity.q = w.clarity.q || []).push(args); };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${id}`;
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(s, first);
}
