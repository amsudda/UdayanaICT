import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* 8-bit pixel star, reused for accents. */
export function PixelStar({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`pixel-svg ${className}`} fill="currentColor">
      <rect x="7" y="2" width="2" height="12" />
      <rect x="2" y="7" width="12" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
    </svg>
  );
}

/**
 * Scroll-reveal pixel accent — pops in (scale + spin) the first time it
 * scrolls into view. Kept sparse: one per section heading, not everywhere.
 */
export function PixelReveal({ className = 'w-4 h-4 text-amber-400' }: { className?: string }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -45, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      className={`inline-block align-middle ${className}`}
    >
      <PixelStar className="w-full h-full" />
    </motion.span>
  );
}

const BURST_COLORS = ['#c20f24', '#f59e0b', '#ef4444', '#ffffff'];
// fixed angles so the burst reads as a deliberate radial "power-up", not noise
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 46 + (i % 3) * 14;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    color: BURST_COLORS[i % BURST_COLORS.length],
  };
});

/**
 * The signature interaction. A primary CTA that fires a pixel "power-up"
 * burst on click, then navigates. Boldness spent in exactly one place.
 */
export function PixelBurstButton({
  to,
  children,
  className = '',
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const [bursting, setBursting] = useState(false);

  const handleClick = () => {
    if (bursting) return;
    setBursting(true);
    // let the burst play, then go
    window.setTimeout(() => navigate(to), 380);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        className={`relative h-12 px-7 min-w-[160px] rounded-full bg-[#c20f24] text-white font-semibold shadow-[0_8px_24px_rgba(194,15,36,0.35)] transition-transform duration-150 hover:bg-[#9c0c1d] hover:scale-[1.03] active:scale-95 ${className}`}
      >
        {children}
      </button>

      <AnimatePresence>
        {bursting &&
          BURST.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              className="pixel-svg pointer-events-none absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1"
              style={{ background: p.color }}
            />
          ))}
      </AnimatePresence>
    </span>
  );
}
