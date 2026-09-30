import { useEffect, useState } from 'react';
import { ImageOffIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react';

/**
 * A question that is a photograph of the printed paper.
 *
 * These questions carry no text — the image *is* the question — so a blank
 * space while it loads, or if it fails, leaves a student staring at five
 * numbered options with nothing to answer. This says which of the two is
 * happening and gives them a way out.
 *
 * It also loads eagerly and at high priority. `loading="lazy"` was wrong
 * here twice over: the image is the main content of the screen, and the
 * card sits inside an animated (transformed) container, where some mobile
 * browsers judge a lazy image to be off-screen and never fetch it until
 * something scrolls — which is how a student ends up seeing no image at
 * all on a page that works on the teacher's desktop.
 */
export function QuestionImage({ src, className = '' }: { src: string; className?: string }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  // a fresh question means a fresh load
  useEffect(() => { setStatus('loading'); setRetry(0); }, [src]);

  // the retry count also busts a half-cached response
  const url = retry > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${retry}` : src;

  return (
    <div className={`relative ${className}`}>
      {status !== 'ok' && (
        <div className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 py-14 flex flex-col items-center justify-center gap-3 text-center px-6">
          {status === 'loading' ? (
            <>
              <Loader2Icon className="w-6 h-6 text-slate-300 animate-spin" />
              <p className="text-sm text-slate-400">Loading the question…</p>
            </>
          ) : (
            <>
              <ImageOffIcon className="w-7 h-7 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">This question&rsquo;s image didn&rsquo;t load</p>
              <p className="text-xs text-slate-400 -mt-1">Check your connection, then try again.</p>
              <button
                type="button"
                onClick={() => { setStatus('loading'); setRetry((r) => r + 1); }}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c20f24] text-white text-xs font-bold hover:bg-[#a60d1f] transition-colors"
              >
                <RefreshCwIcon className="w-3.5 h-3.5" /> Try again
              </button>
            </>
          )}
        </div>
      )}

      <img
        key={url}
        src={url}
        alt=""
        decoding="async"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ fetchpriority: 'high' } as any)}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
        className={`w-full object-contain rounded-xl border border-slate-100 dark:border-slate-800 bg-white ${status === 'ok' ? '' : 'hidden'}`}
      />
    </div>
  );
}

/**
 * Warms images the student is about to need — the next question, usually —
 * while they read the current one, so paging through a paper doesn't wait
 * on the network each time.
 */
export function usePreloadImages(urls: (string | null | undefined)[]) {
  const key = urls.filter(Boolean).join('|');
  useEffect(() => {
    if (!key) return;
    const imgs = key.split('|').map((u) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = u;
      return img;
    });
    return () => { imgs.forEach((i) => { i.src = ''; }); };
  }, [key]);
}
