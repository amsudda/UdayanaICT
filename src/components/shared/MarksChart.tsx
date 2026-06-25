import { useState } from 'react';

export type Mark = {
  id: string;
  title: string;
  paper_no: number | null;
  type: string;
  marks: number;
  max_marks: number;
  exam_date: string | null;
};

const pctOf = (m: Mark) => Math.max(0, Math.min(100, m.max_marks ? (Number(m.marks) / Number(m.max_marks)) * 100 : 0));

export function MarksChart({ marks }: { marks: Mark[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const sorted = [...marks].sort((a, b) => {
    const da = a.exam_date ? new Date(a.exam_date).getTime() : 0;
    const db = b.exam_date ? new Date(b.exam_date).getTime() : 0;
    if (da !== db) return da - db;
    return (a.paper_no ?? 0) - (b.paper_no ?? 0);
  });

  const W = 640, H = 280, padL = 38, padR = 18, padT = 18, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = sorted.length;

  const x = (i: number) => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (p: number) => padT + (1 - p / 100) * plotH;

  const lineFor = (type: string) =>
    sorted.map((m, i) => ({ m, i })).filter((o) => o.m.type === type).map((o) => `${x(o.i)},${y(pctOf(o.m))}`).join(' ');

  if (n === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-apple-subtext dark:text-slate-400">No marks yet.</p>
        <p className="text-xs text-apple-subtext/70 dark:text-slate-500 mt-1">Your paper marks will appear here as the tutor adds them.</p>
      </div>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ touchAction: 'pan-y' }}>
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="1" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" className="fill-gray-400" fontSize="9">{g}%</text>
          </g>
        ))}

        {/* lines */}
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={lineFor('timing')} />
        <polyline fill="none" stroke="#c20f24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={lineFor('full')} />

        {/* points */}
        {sorted.map((m, i) => (
          <circle
            key={m.id}
            cx={x(i)}
            cy={y(pctOf(m))}
            r={hover === i ? 6 : 4}
            fill={m.type === 'full' ? '#c20f24' : '#f59e0b'}
            stroke="#fff"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
          />
        ))}

        {/* tooltip */}
        {hover !== null && (() => {
          const m = sorted[hover];
          const px = x(hover);
          const py = y(pctOf(m));
          const label = `${m.title}${m.paper_no ? ` · No ${m.paper_no}` : ''}`;
          const tw = Math.min(Math.max(label.length * 5.4 + 16, 96), 220);
          let tx = px - tw / 2;
          tx = Math.max(padL, Math.min(tx, W - padR - tw));
          const ty = Math.max(2, py - 42);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={34} rx={6} className="fill-slate-900" />
              <text x={tx + 8} y={ty + 14} fontSize="9" className="fill-white">{label}</text>
              <text x={tx + 8} y={ty + 27} fontSize="11" fontWeight="bold" className="fill-amber-400">{pctOf(m).toFixed(1)}%</text>
            </g>
          );
        })()}
      </svg>

      <div className="flex gap-5 justify-center mt-2 text-xs text-apple-subtext dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#c20f24' }} /> Full Paper</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} /> Timing Paper</span>
      </div>
    </div>
  );
}
