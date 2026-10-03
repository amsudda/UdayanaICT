import { useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Admin charts.
 *
 * Hand-rolled SVG rather than a charting library: a few hundred bytes of
 * markup, and full control of the two things libraries make hardest — how
 * a chart arrives, and how it answers a pointer.
 *
 * Motion, for the entrance (seen occasionally, so it earns a moment):
 *   - the line draws itself with stroke-dashoffset, in CSS so it keeps its
 *     frame rate while the dashboard is still fetching;
 *   - the fill fades behind it rather than wiping alongside it;
 *   - bars grow from their baseline, 40ms apart; donut segments sweep;
 *   - nothing runs past 600ms, and none of it runs under reduced motion.
 *
 * Motion, for the hover (seen constantly, so it must be nearly invisible):
 *   - 120ms, opacity and transform only, no delay, no spring;
 *   - the tooltip follows the pointer with no entrance animation after the
 *     first — a tooltip that re-animates on every sample flickers;
 *   - pointer events, not mouse events, so a tap on a phone reads a value
 *     instead of doing nothing.
 */

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

type Point = { label: string; total: number };

/** Nice round axis ceiling, so the top gridline is a number a person would say. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : n >= 1_000 ? `${Math.round(n / 1000)}k`
      : String(Math.round(n));

/** The floating read-out. Positioned by the caller, never animated in. */
function Tooltip({ x, label, value, align }: { x: number; label: string; value: string; align: 'left' | 'center' | 'right' }) {
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 rounded-xl bg-slate-900 text-white px-3 py-2 shadow-lg shadow-black/10 whitespace-nowrap"
      style={{
        left: x,
        transform: `translateX(${align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%'})`
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</p>
      <p className="text-[13px] font-bold tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

/* ── Area chart ────────────────────────────────────────────────────── */

export function AreaChart({
  points,
  height = 260,
  color = '#c20f24',
  valueFormat = short,
  tooltipFormat,
  showAverage = true
}: {
  points: Point[];
  height?: number;
  color?: string;
  valueFormat?: (n: number) => string;
  /** Full precision for the hover read-out; the axis stays abbreviated. */
  tooltipFormat?: (n: number) => string;
  showAverage?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = height;
  const PAD_L = 46;
  const PAD_R = 14;
  const PAD_T = 14;
  const PAD_B = 30;

  if (points.length < 2) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-400">Not enough data yet.</div>;
  }

  const max = niceMax(Math.max(...points.map((p) => p.total), 1));
  const x = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_T - PAD_B);

  const line = points.map((p, i) => `${x(i)},${y(p.total)}`).join(' L ');
  const area = `M ${x(0)},${H - PAD_B} L ${line} L ${x(points.length - 1)},${H - PAD_B} Z`;
  const avg = points.reduce((s, p) => s + p.total, 0) / points.length;

  const step = Math.max(1, Math.ceil(points.length / 7));

  /** Nearest point to the pointer. The plot is stretched to the element's
   *  width, so the padding scales with it rather than staying 46px. */
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const padL = (PAD_L / W) * r.width;
    const padR = (PAD_R / W) * r.width;
    const t = (e.clientX - r.left - padL) / Math.max(1, r.width - padL - padR);
    const i = Math.round(t * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const hovered = hover === null ? null : points[hover];
  const fmtTip = tooltipFormat ?? valueFormat;

  // keep the tooltip inside the card at either end
  const hoverPct = hover === null ? 0 : x(hover) / W;
  const align = hoverPct < 0.12 ? 'left' : hoverPct > 0.88 ? 'right' : 'center';

  return (
    <div
      ref={wrapRef}
      className="relative touch-pan-y"
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={() => setHover(null)}
    >
      {hovered && (
        <Tooltip x={`${hoverPct * 100}%` as unknown as number} label={hovered.label} value={fmtTip(hovered.total)} align={align} />
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height }} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, gi) => (
          <g key={t} style={reduce ? undefined : { animation: `chart-fade 260ms ${EASE} both`, animationDelay: `${gi * 35}ms` }}>
            <line
              x1={PAD_L} x2={W - PAD_R} y1={y(max * t)} y2={y(max * t)}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 5'}
            />
            <text x={PAD_L - 10} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {valueFormat(max * t)}
            </text>
          </g>
        ))}

        {showAverage && avg > 0 && (
          <line x1={PAD_L} x2={W - PAD_R} y1={y(avg)} y2={y(avg)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.5" />
        )}

        <path d={area} fill={`url(#fill-${uid})`} style={reduce ? undefined : { animation: `chart-fade 420ms ${EASE} both`, animationDelay: '120ms' }} />

        <path
          d={`M ${line}`}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={reduce ? undefined : { strokeDasharray: 1, strokeDashoffset: 1, animation: `chart-draw 600ms ${EASE} forwards` }}
        />

        {/* crosshair for whatever the pointer is nearest */}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)} x2={x(hover)} y1={PAD_T - 6} y2={H - PAD_B}
              stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity="0.45"
            />
            <circle cx={x(hover)} cy={y(points[hover].total)} r="9" fill={color} opacity="0.14" />
            <circle cx={x(hover)} cy={y(points[hover].total)} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" />
          </g>
        )}

        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            {points.length <= 14 && hover !== i && (
              <circle
                cx={x(i)} cy={y(p.total)} r="3.5" fill="#fff" stroke={color} strokeWidth="2"
                style={reduce ? undefined : { animation: `chart-fade 240ms ${EASE} both`, animationDelay: `${300 + i * 20}ms` }}
              />
            )}
            {(i % step === 0 || i === points.length - 1) && (
              <text
                x={x(i)} y={H - 8} textAnchor="middle" fontSize="11"
                fill={hover === i ? '#0f172a' : '#94a3b8'}
                style={reduce ? undefined : { animation: `chart-fade 260ms ${EASE} both`, animationDelay: `${120 + i * 15}ms` }}
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Bar chart ─────────────────────────────────────────────────────── */

export function BarChart({
  points,
  height = 220,
  color = '#c20f24',
  suffix = '',
  caption
}: {
  points: Point[];
  height?: number;
  color?: string;
  suffix?: string;
  /** Extra line in the hover read-out, e.g. "12 marks recorded". */
  caption?: (p: Point, i: number) => string | undefined;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div className="h-32 flex items-center justify-center text-sm text-slate-400">No data yet.</div>;

  const max = niceMax(Math.max(...points.map((p) => p.total), 1));

  return (
    <div className="flex items-end gap-3" style={{ height }} onPointerLeave={() => setHover(null)}>
      {points.map((p, i) => {
        const on = hover === i;
        const dim = hover !== null && !on;
        const extra = caption?.(p, i);
        return (
          <div
            key={`${p.label}-${i}`}
            className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end cursor-default"
            onPointerEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          >
            <span
              className={`text-[12px] font-bold tabular-nums transition-colors duration-150 ${on ? 'text-[#c20f24]' : 'text-slate-900'}`}
              style={reduce ? undefined : { animation: `chart-fade 260ms ${EASE} both`, animationDelay: `${160 + i * 40}ms` }}
            >
              {Math.round(p.total)}{suffix}
            </span>

            <div className="relative w-full max-w-[64px] flex justify-center">
              {on && extra && (
                <div // clears the value label above the bar rather than covering it
                  className="pointer-events-none absolute -top-[60px] z-10 rounded-xl bg-slate-900 text-white px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap shadow-lg">
                  {extra}
                </div>
              )}
              <div
                className="w-full rounded-t-lg transition-[opacity,transform] duration-150 ease-out"
                style={{
                  height: `${(p.total / max) * (height - 54)}px`,
                  background: `linear-gradient(to top, ${color}, ${color}bb)`,
                  transformOrigin: 'bottom',
                  opacity: dim ? 0.45 : 1,
                  transform: on && !reduce ? 'translateY(-3px)' : undefined,
                  ...(reduce ? {} : { animation: `bar-grow 420ms ${EASE} both`, animationDelay: `${i * 40}ms` })
                }}
              />
            </div>

            <span
              className={`text-[11px] truncate max-w-full transition-colors duration-150 ${on ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}
              title={p.label}
            >
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut ─────────────────────────────────────────────────────────── */

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 180
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const active = hover === null ? null : segments[hover];

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }} onPointerLeave={() => setHover(null)}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const on = hover === i;
            const el = (
              <circle
                key={s.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={on ? 20 : 16}
                strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                opacity={hover !== null && !on ? 0.4 : 1}
                className="cursor-default transition-[stroke-width,opacity] duration-150 ease-out"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
                style={reduce ? undefined : {
                  ['--len' as any]: `${len}`,
                  ['--rest' as any]: `${c - len}`,
                  ['--c' as any]: `${c}`,
                  animation: `donut-sweep 520ms ${EASE} both`,
                  animationDelay: `${120 + i * 140}ms`
                }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>

        {/* the middle answers whatever the pointer is on, and falls back to
            the headline figure when it leaves */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[26px] font-bold text-slate-900 leading-none tabular-nums transition-opacity duration-150">
            {active ? `${Math.round((active.value / total) * 100)}%` : centerValue}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 max-w-[80%] text-center truncate transition-opacity duration-150">
            {active ? active.label.toLowerCase() : centerLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {segments.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            className={`w-full flex items-center gap-2.5 text-sm rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-150 ${
              hover === i ? 'bg-slate-50' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-left text-slate-600 truncate">{s.label}</span>
            <span className="text-[11px] text-slate-400 tabular-nums">{s.value}</span>
            <span className="font-bold text-slate-900 tabular-nums w-10 text-right">{Math.round((s.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Sparkline with a fill, for stat cards ─────────────────────────── */

export function AreaSpark({ points, color = '#c20f24', height = 42 }: { points: number[]; color?: string; height?: number }) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  if (points.length < 2) return <div style={{ height }} />;

  const W = 300;
  const H = height;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  // the line lives in the upper band; the fill runs to the floor. Without
  // the gap the stroke sits on the card's border and eats it at the corners.
  const y = (v: number) => H - 10 - ((v - min) / span) * (H - 22);
  const line = points.map((p, i) => `${x(i)},${y(p)}`).join(' L ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full block" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,${H} L ${line} L ${W},${H} Z`} fill={`url(#spark-${uid})`} />
      <path
        d={`M ${line}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        style={reduce ? undefined : { strokeDasharray: 1, strokeDashoffset: 1, animation: `chart-draw 560ms ${EASE} forwards` }}
      />
    </svg>
  );
}
