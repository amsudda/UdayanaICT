import { motion } from 'framer-motion';
import { ClockIcon, ClockAlertIcon, LayersIcon, PlayIcon, ShoppingCartIcon, CheckCircleIcon } from 'lucide-react';

type PackStatus = 'none' | 'pending' | 'owned';

interface VideoPackProps {
  pack: {
    id: string;
    title: string;
    type: string;
    price: number;
    thumbnailUrl?: string;
    duration: string;
    videoCount: number;
  };
  status?: PackStatus;
  onBuy?: () => void;
}

/** Per-type accent: a solid colour that carries meaning across the card. */
const typeAccent: Record<string, { rail: string; chip: string; stack: string }> = {
  'Paper Classes': { rail: 'bg-violet-500', chip: 'bg-violet-500/90', stack: 'bg-violet-200 dark:bg-violet-500/30' },
  Theory: { rail: 'bg-blue-500', chip: 'bg-blue-500/90', stack: 'bg-blue-200 dark:bg-blue-500/30' },
  Revision: { rail: 'bg-emerald-500', chip: 'bg-emerald-500/90', stack: 'bg-emerald-200 dark:bg-emerald-500/30' }
};

export function VideoPackCard({ pack, status = 'none', onBuy }: VideoPackProps) {
  const accent = typeAccent[pack.type] ?? {
    rail: 'bg-slate-400',
    chip: 'bg-slate-500/90',
    stack: 'bg-slate-200 dark:bg-slate-600'
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="group relative flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 shadow-[0_4px_20px_rgba(15,23,42,0.05)] hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300"
    >
      {/* ── thumbnail with "stacked playlist" motif ── */}
      <div className="relative px-3 pt-3">
        {/* depth layers peeking behind — signals "a pack of videos" */}
        <div className={`absolute left-6 right-6 -top-0.5 h-3 rounded-t-2xl ${accent.stack} opacity-60`} />
        <div className="absolute left-4 right-4 top-1 h-3 rounded-t-2xl bg-gray-100 dark:bg-slate-800" />

        <div className="relative overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800" style={{ aspectRatio: '16/9' }}>
          {pack.thumbnailUrl && (
            <img
              src={pack.thumbnailUrl}
              alt={pack.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

          {/* type tag */}
          <span className={`absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-lg text-white shadow-sm ${accent.chip}`}>
            {pack.type}
          </span>

          {/* video count — the playlist signature */}
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-2 py-1 rounded-lg">
            <LayersIcon className="w-3 h-3" />
            {pack.videoCount}
          </span>

          {/* runtime */}
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2 py-1 rounded-lg">
            <ClockIcon className="w-3 h-3" />
            {pack.duration}
          </span>

          {/* hover play affordance */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 backdrop-blur shadow-lg">
              <PlayIcon className="w-7 h-7 text-[#c20f24] fill-current ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ── content ── */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-[15px] font-bold text-apple-text dark:text-apple-light leading-snug line-clamp-2 min-h-[2.6em]">
          {pack.title}
        </h3>

        {/* price/CTA bar */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-apple-subtext dark:text-slate-500 font-semibold mb-0.5">
              One-time
            </p>
            <p className="text-xl font-black text-apple-text dark:text-apple-light leading-none">
              <span className="text-sm align-top mr-0.5">Rs.</span>
              {pack.price.toLocaleString()}
            </p>
          </div>

          {status === 'pending' ? (
            <span className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm font-semibold px-4 h-11 rounded-2xl">
              <ClockAlertIcon className="w-4 h-4" />
              Pending
            </span>
          ) : status === 'owned' ? (
            <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-4 h-11 rounded-2xl">
              <CheckCircleIcon className="w-4 h-4" />
              Owned
            </span>
          ) : (
            <button
              type="button"
              onClick={onBuy}
              className="flex items-center gap-2 bg-[#c20f24] hover:bg-[#9c0c1d] active:scale-95 text-white text-sm font-semibold px-5 h-11 rounded-2xl shadow-[0_6px_20px_rgba(194,15,36,0.32)] hover:shadow-[0_8px_28px_rgba(194,15,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/50 focus-visible:ring-offset-2 transition-all duration-200"
            >
              <ShoppingCartIcon className="w-4 h-4" />
              Buy
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
