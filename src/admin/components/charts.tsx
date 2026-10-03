import { useId } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Admin charts.
 *
 * Hand-rolled SVG rather than a charting library: three shapes, a few
 * hundred bytes of markup, and full control of the one thing a library
 * makes hardest — how the thing draws itself on arrival.
 *
 * Motion rules followed here (these are read occasionally, not hundreds of
 * times a day, so a short entrance earns its place):
 *   - the line draws once, with stroke-dashoffset, in CSS so it runs off
 *     the main thread while the dashboard is still fetching;
 *   - the fill fades behind it rather than wiping, so the two do not
 *     compete;
 *   - bars grow from their baseline, staggered 40ms apart;
 *   - everything stops at or under 600ms, and nothing animates at all
 *     under prefers-reduced-motion.
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

/* ── Area chart ────────────────────────────────────────────────────── */

export function AreaChart({
  points,
  height = 260,
  color = '#c20f24',
  valueFormat = short,
  showAverage = true
}: {
  points: Point[];
  height?: number;
  color?: string;
  valueFormat?: (n: number) => string;
  showAverage?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();

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

  // one label every nth point, so a 30-day range does not turn into mush
  const step = Math.max(1, Math.ceil(points.length / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img">
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
          <text x={PAD_L - 10} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8" vectorEffect="non-scaling-stroke">
            {valueFormat(max * t)}
          </text>
        </g>
      ))}

      {/* the average, so a month reads as above or below the usual */}
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

      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          {points.length <= 14 && (
            <circle
              cx={x(i)} cy={y(p.total)} r="3.5" fill="#fff" stroke={color} strokeWidth="2"
              style={reduce ? undefined : { animation: `chart-fade 240ms ${EASE} both`, animationDelay: `${300 + i * 20}ms` }}
            />
          )}
          {(i % step === 0 || i === points.length - 1) && (
            <text
              x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#94a3b8"
              style={reduce ? undefined : { animation: `chart-fade 260ms ${EASE} both`, animationDelay: `${120 + i * 15}ms` }}
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ── Bar chart ─────────────────────────────────────────────────────── */

export function BarChart({
  points,
  height = 220,
  color = '#c20f24',
  suffix = ''
}: {
  points: Point[];
  height?: number;
  color?: string;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  if (!points.length) return <div className="h-32 flex items-center justify-center text-sm text-slate-400">No data yet.</div>;

  const max = niceMax(Math.max(...points.map((p) => p.total), 1));

  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {points.map((p, i) => (
        <div key={`${p.label}-${i}`} className="flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end">
          <span
            className="text-[12px] font-bold text-slate-900 tabular-nums"
            style={reduce ? undefined : { animation: `chart-fade 260ms ${EASE} both`, animationDelay: `${160 + i * 40}ms` }}
          >
            {Math.round(p.total)}{suffix}
          </span>
          <div
            // capped: four batches should not become slabs the width of a hand
            className="w-full max-w-[64px] rounded-t-lg"
            style={{
              height: `${(p.total / max) * (height - 54)}px`,
              background: `linear-gradient(to top, ${color}, ${color}bb)`,
              transformOrigin: 'bottom',
              ...(reduce ? {} : { animation: `bar-grow 420ms ${EASE} both`, animationDelay: `${i * 40}ms` })
            }}
          />
          <span className="text-[11px] text-slate-400 truncate max-w-full" title={p.label}>{p.label}</span>
        </div>
      ))}
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
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                // the ring draws itself, segment after segment, rather than
                // appearing whole — stroke-dasharray is animatable, so this
                // stays a CSS animation off the main thread
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-bold text-slate-900 leading-none tabular-nums">{centerValue}</span>
          <span className="text-[11px] text-slate-400 mt-1">{centerLabel}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-slate-600 truncate">{s.label}</span>
            <span className="font-bold text-slate-900 tabular-nums">{Math.round((s.value / total) * 100)}%</span>
          </div>
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
    <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full" preserveAspectRatio="none" aria-hidden>
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
