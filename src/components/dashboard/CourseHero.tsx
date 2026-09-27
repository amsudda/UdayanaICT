import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon, FilmIcon } from 'lucide-react';

/**
 * The class hero.
 *
 * A looping motion-graphics composition that plays by itself: a network of
 * nodes with signal running along its lines, particles rising through the
 * panel, dashed rings turning at three different rates, and a light sweep
 * that crosses every eleven seconds.
 *
 * How it is built, and why:
 *
 *  - Every loop is a CSS animation (`hero-*` in index.css), not a JS one.
 *    CSS animations run off the main thread, so the composition holds its
 *    frame rate while the page is still fetching lessons — exactly when a
 *    requestAnimationFrame loop would stutter.
 *  - Only transform and opacity animate, plus stroke-dashoffset for the
 *    travelling signal. Nothing here triggers layout or paint.
 *  - The cycle lengths (3.4s, 7s, 9s, 11s, 13s, 17s, 19s, 23s, 31s, 42s,
 *    63s) share no useful common multiple, so the layers never fall into
 *    step and the loop never announces itself.
 *  - Every element is staged right of centre and held under ~30% opacity,
 *    so it plays behind the title without competing with it.
 *
 * Framer Motion is used only for the one-time entrance, which is
 * state-driven and has to be interruptible.
 */

/** Strong ease-out. Entrances only. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Props = {
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  watchedCount: number;
  total: number;
  onBack: () => void;
};

/** Counts a number up on arrival. Jumps straight to it when motion is reduced. */
function useCountUp(target: number, animated: boolean, duration = 0.9) {
  const mv = useMotionValue(0);
  const [shown, setShown] = useState(animated ? 0 : target);

  useEffect(() => {
    if (!animated) { setShown(target); return; }
    const controls = animate(mv, target, {
      duration,
      delay: 0.35,
      ease: EASE_OUT,
      onUpdate: (v) => setShown(Math.round(v))
    });
    return () => controls.stop();
  }, [target, animated, duration, mv]);

  return shown;
}

/** Nodes of the network, positioned in percentages of the panel. */
const NODES = [
  { x: 57, y: 24, r: 6, fill: '#ffffff', delay: 0 },
  { x: 68, y: 66, r: 7, fill: '#fbbf24', delay: 0.9 },
  { x: 79, y: 20, r: 5.5, fill: '#fef3c7', delay: 1.8 },
  { x: 85, y: 74, r: 9, fill: '#fbbf24', delay: 0.45 },
  { x: 94, y: 44, r: 6, fill: '#ffffff', delay: 2.3 }
];

/** The lines the signal runs along. Delays send it round the shape. */
const LINKS = [
  { x1: 57, y1: 24, x2: 68, y2: 66, stroke: '#fbbf24', delay: 0 },
  { x1: 68, y1: 66, x2: 85, y2: 74, stroke: '#ffffff', delay: 1.2 },
  { x1: 85, y1: 74, x2: 94, y2: 44, stroke: '#ffffff', delay: 2.4 },
  { x1: 94, y1: 44, x2: 79, y2: 20, stroke: '#fbbf24', delay: 3.6 },
  { x1: 79, y1: 20, x2: 57, y2: 24, stroke: '#fef3c7', delay: 4.8 }
];

/** Particles rising through the panel. */
const MOTES = [
  { left: '56%', size: 3, delay: 0, dur: 13 },
  { left: '64%', size: 2, delay: 3.4, dur: 17 },
  { left: '71%', size: 4, delay: 6.1, dur: 15 },
  { left: '77%', size: 2.5, delay: 1.7, dur: 19 },
  { left: '86%', size: 3, delay: 8.2, dur: 14 },
  { left: '94%', size: 2, delay: 4.9, dur: 16 }
];

export function CourseHero({ title, description, thumbnail, watchedCount, total, onBack }: Props) {
  const reduce = useReducedMotion();
  const animated = !reduce;

  const pct = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
  const shownPct = useCountUp(pct, animated);
  const shownCount = useCountUp(watchedCount, animated);

  // The contents arrive in reading order, 60ms apart. Nothing lands at the
  // same moment as anything else.
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: animated ? 0.06 : 0, delayChildren: animated ? 0.08 : 0 } }
  };
  const rise = animated
    ? {
        hidden: { opacity: 0, transform: 'translateY(10px)' },
        show: { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.42, ease: EASE_OUT } }
      }
    : { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } };

  return (
    <motion.div
      initial={animated ? { opacity: 0, transform: 'translateY(14px) scale(0.995)' } : { opacity: 0 }}
      animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="relative rounded-[2rem] overflow-hidden mb-8 shadow-[0_20px_40px_rgba(194,15,36,0.15)] bg-gradient-to-br from-[#7a0010] to-[#c20f24]"
    >
      {/* ══ The composition ══════════════════════════════════════════ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        {/* Far layer: the grid, creeping one tile every 17s. Oversized, so
            the translation never exposes an edge. */}
        <div
          className="absolute -inset-[60px] opacity-[0.14] hero-grid"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Atmospheric glows, breathing on their own clocks */}
        <div className="absolute top-0 left-[18%] w-[55%] h-full bg-gradient-to-br from-white to-[#fbbf24] blur-[120px] rounded-full mix-blend-screen hero-drift" />
        <div
          className="absolute -bottom-1/3 right-[6%] w-[38%] h-[140%] bg-[#ff3b3b] blur-[110px] rounded-full mix-blend-screen hero-drift"
          style={{ animationDelay: '-7s', animationDuration: '23s' }}
        />

        {/* Mid layer: dashed rings, opposed and at different rates */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="courseHeroGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="courseHeroSilver" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <circle
            cx="20%" cy="50%" r="180"
            fill="none" stroke="url(#courseHeroGold)" strokeWidth="4" strokeDasharray="16 28"
            className="hero-spin"
            style={{ transformOrigin: '20% 50%' }}
          />
          <circle
            cx="80%" cy="30%" r="220"
            fill="none" stroke="url(#courseHeroSilver)" strokeWidth="3" strokeDasharray="12 24"
            className="hero-spin-slow"
            style={{ transformOrigin: '80% 30%' }}
          />
          <circle
            cx="80%" cy="30%" r="150"
            fill="none" stroke="url(#courseHeroGold)" strokeWidth="1.5" strokeDasharray="4 18"
            className="hero-spin"
            style={{ transformOrigin: '80% 30%', animationDuration: '31s' }}
          />
        </svg>

        {/* Near layer: the network. Lines and nodes share one set of
            percentage coordinates, so the signal always lands on a node.
            Each line starts its run at its own moment, which sends the
            pulse around the shape instead of firing everywhere at once. */}
        <svg className="absolute inset-0 w-full h-full overflow-visible">

          {/* the dim tracks */}
          {LINKS.map((l, i) => (
            <line
              key={`t${i}`}
              x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
              stroke={l.stroke} strokeWidth="1.5" opacity="0.32"
            />
          ))}

          {/* the signal running along them */}
          {LINKS.map((l, i) => (
            <line
              key={`s${i}`}
              x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
              stroke={l.stroke} strokeWidth="9" strokeLinecap="round" opacity="0.25"
              strokeDasharray="18 120"
              className="hero-dash"
              style={{ animationDelay: `${-l.delay}s`, filter: 'blur(3px)' }}
            />
          ))}

          {/* the bright core of the signal, riding the same timing */}
          {LINKS.map((l, i) => (
            <line
              key={`c${i}`}
              x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
              stroke={l.stroke} strokeWidth="3" strokeLinecap="round" opacity="0.95"
              strokeDasharray="18 120"
              className="hero-dash"
              style={{ animationDelay: `${-l.delay}s` }}
            />
          ))}

          {/* nodes: a halo, a ping that expands and fades, and the core */}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle cx={`${n.x}%`} cy={`${n.y}%`} r={n.r * 3} fill={n.fill} opacity="0.1" style={{ filter: 'blur(6px)' }} />
              <circle cx={`${n.x}%`} cy={`${n.y}%`} r={n.r * 1.7} fill={n.fill} opacity="0.16" />
              <circle
                cx={`${n.x}%`} cy={`${n.y}%`} r={n.r}
                fill="none" stroke={n.fill} strokeWidth="2"
                className="hero-ping"
                style={{ transformOrigin: `${n.x}% ${n.y}%`, animationDelay: `${-n.delay}s` }}
              />
              <circle
                cx={`${n.x}%`} cy={`${n.y}%`} r={n.r}
                fill={n.fill}
                className="hero-pulse"
                style={{ transformOrigin: `${n.x}% ${n.y}%`, animationDelay: `${-n.delay}s` }}
              />
            </g>
          ))}
        </svg>

        {/* Motes drifting up through all of it */}
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-[#fff7e0] shadow-[0_0_8px_rgba(254,243,199,0.9)] hero-rise"
            style={{
              left: m.left,
              width: m.size,
              height: m.size,
              animationDelay: `${-m.delay}s`,
              animationDuration: `${m.dur}s`
            }}
          />
        ))}

        {/* The sweep: waits out most of its eleven seconds, then crosses fast */}
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-md hero-sheen" />
      </div>

      {/* Darkening, so the text keeps its contrast whatever moves behind it */}
      <div className="absolute inset-0 bg-[#7a0010]/15 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#7a0010] via-[#7a0010]/70 via-45% to-transparent pointer-events-none" />

      {/* ══ Content ══════════════════════════════════════════════════ */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col md:flex-row items-center gap-5 md:gap-6 p-5 md:p-6"
      >
        <motion.div
          variants={rise}
          className="w-full max-w-[220px] md:w-[220px] aspect-video rounded-xl overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10 group"
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              /* hover gated: a tap on a phone fires a false hover */
              className="w-full h-full object-cover transition-transform duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <FilmIcon className="w-16 h-16 text-slate-600" />
            </div>
          )}
        </motion.div>

        <div className="flex-1 text-center md:text-left z-10">
          <motion.button
            variants={rise}
            onClick={onBack}
            whileHover={animated ? { transform: 'translateX(-2px)' } : undefined}
            whileTap={animated ? { transform: 'scale(0.97)' } : undefined}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-colors mb-3"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" /> MY CLASSES
          </motion.button>

          <motion.h1
            variants={rise}
            className="text-xl md:text-3xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-md"
          >
            {title}
          </motion.h1>

          {description && (
            <motion.p variants={rise} className="text-white/80 text-sm mb-4 max-w-2xl leading-relaxed font-medium drop-shadow">
              {description}
            </motion.p>
          )}

          <motion.div
            variants={rise}
            className="flex flex-col sm:flex-row items-center sm:items-end gap-4 max-w-md bg-white/5 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/10"
          >
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between text-xs font-bold text-white/80 mb-2 uppercase tracking-wider">
                <span>Progress</span>
                <span className="text-[#ff3b3b] tabular-nums">{shownPct}%</span>
              </div>
              {/* scaleX, not width: width relayouts the bar on every frame */}
              <div className="relative h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={animated ? { transform: 'scaleX(0)' } : false}
                  animate={{ transform: `scaleX(${Math.max(pct, 0) / 100})` }}
                  transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT }}
                  style={{ transformOrigin: 'left center' }}
                  className="h-full w-full bg-gradient-to-r from-[#fbbf24] to-[#fef3c7] rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                />
                {/* light running along the filled part, so the bar keeps
                    living after it has finished filling */}
                {animated && pct > 0 && (
                  <div className="absolute inset-y-0 left-0 rounded-full overflow-hidden" style={{ width: `${pct}%` }}>
                    <div
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent hero-sheen"
                      style={{ animationDuration: '7s', animationDelay: '-4s' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right w-full sm:w-auto">
              <span className="text-2xl font-black text-white leading-none tabular-nums">{shownCount}</span>
              <span className="text-white/40 font-bold ml-1">/ {total}</span>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-bold">Completed</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
