import { useId, type ReactElement } from 'react';

/**
 * A collectible medal for each achievement.
 *
 * Two layers tell the story:
 *  - the FRAME is the rank tier's material and shape (bronze coin → crimson
 *    crowned medal), so a badge's rarity reads at a glance;
 *  - the ART in the centre is a small illustration of what the student did,
 *    unique to that achievement.
 *
 * Everything is inline SVG in a 100×100 box, so it's crisp at any size.
 * Unknown keys (achievements added later by an admin) get a tier star.
 */

type Palette = {
  rim: [string, string];
  inner: [string, string];
  accent: string;
  cream: string;
};

const TIERS: Record<string, Palette> = {
  novice:     { rim: ['#f0bf86', '#8a5424'], inner: ['#6b3f1c', '#2e1a0b'], accent: '#f3c98b', cream: '#fff4e3' },
  cadet:      { rim: ['#f59a7a', '#9c2f1c'], inner: ['#6d2114', '#2d0c07'], accent: '#ffb199', cream: '#fff1ec' },
  apprentice: { rim: ['#7ff0c3', '#047857'], inner: ['#0b5c47', '#022c22'], accent: '#a7f3d0', cream: '#effff8' },
  explorer:   { rim: ['#8fdcff', '#1d4ed8'], inner: ['#22449c', '#0b1840'], accent: '#bae6fd', cream: '#eff9ff' },
  expert:     { rim: ['#dfc2ff', '#7e22ce'], inner: ['#5424a0', '#240b4a'], accent: '#e9d5ff', cream: '#faf5ff' },
  elite:      { rim: ['#ffc58a', '#c2410c'], inner: ['#8a3413', '#3a1206'], accent: '#fed7aa', cream: '#fff7ed' },
  master:     { rim: ['#fff0a3', '#b45309'], inner: ['#86400f', '#3b1a05'], accent: '#fde68a', cream: '#fffbeb' },
  champion:   { rim: ['#ffb4b4', '#b91c1c'], inner: ['#8a1f1f', '#3f0a0a'], accent: '#fde68a', cream: '#fff5f5' }
};

const GOLD = '#fbbf24';
const RED = '#ef4444';

/* ── helpers ─────────────────────────────────────────────────────── */

function polygon(n: number, rOuter: number, rInner: number, rotate = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = ((rotate + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
}

function gear(cx: number, cy: number, r: number, teeth: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / (teeth * 4);
  for (let i = 0; i < teeth * 4; i++) {
    const rr = i % 4 < 2 ? r : r * 0.78;
    const a = i * step;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
}

function star5(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}Z`;
}

/* ── frames ──────────────────────────────────────────────────────── */

const SHAPES: Record<string, string> = {
  novice: 'M50 4 A46 46 0 1 1 49.99 4Z',
  cadet: 'M50 4 L90 15 V47 C90 73 71 89 50 97 C29 89 10 73 10 47 V15Z',
  apprentice: 'M50 3 L91 26.5 V73.5 L50 97 L9 73.5 V26.5Z',
  explorer: 'M31 4 H69 L96 31 V69 L69 96 H31 L4 69 V31Z',
  expert: 'M50 2 L98 50 L50 98 L2 50Z',
  elite: polygon(12, 48, 40),
  master: 'M50 8 A42 42 0 1 1 49.99 8Z',
  champion: 'M50 12 A40 40 0 1 1 49.99 12Z'
};

/** How much the art is shrunk to sit inside each frame's usable area. */
const ART_SCALE: Record<string, number> = {
  novice: 0.9, cadet: 0.82, apprentice: 0.86, explorer: 0.9, expert: 0.72, elite: 0.8, master: 0.78, champion: 0.72
};

function Laurel({ color }: { color: string }) {
  // leaves climb both sides of the medal, from the bottom toward the top
  const leaves: ReactElement[] = [];
  for (let i = 0; i < 7; i++) {
    const deg = 118 + i * 19; // left side: bottom-left → upper-left
    for (const angle of [deg, 180 - deg]) {
      const rad = (angle * Math.PI) / 180;
      const x = 50 + 47 * Math.cos(rad);
      const y = 50 + 47 * Math.sin(rad);
      leaves.push(
        <ellipse key={`${angle}`} cx={x} cy={y} rx={3.4} ry={7.5} fill={color} transform={`rotate(${angle} ${x} ${y})`} />
      );
    }
  }
  return <g>{leaves}</g>;
}

function Crown() {
  return (
    <g>
      {[-60, -35, -10, 10, 35, 60].map((d) => (
        <path key={d} d="M50 50 L47 6 L53 6Z" fill={GOLD} opacity={0.35} transform={`rotate(${d} 50 50)`} />
      ))}
      <path d="M33 16 L37 3 L44 11 L50 1 L56 11 L63 3 L67 16Z" fill={GOLD} stroke="#92400e" strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx={50} cy={4} r={2} fill={RED} />
    </g>
  );
}

/* ── the art: one story per achievement ──────────────────────────── */

type Art = (p: Palette) => ReactElement;

const ART: Record<string, Art> = {
  // NOVICE — first steps
  quiz_rookie: (p) => ( // a question sprouts its first leaf
    <g>
      <path d="M39 43 a11 11 0 1 1 17 9 c-4.5 3 -6 5 -6 11" stroke={p.cream} strokeWidth={6} fill="none" strokeLinecap="round" />
      <circle cx={50} cy={74} r={3.6} fill={p.cream} />
      <path d="M52 30 c2 -8 7 -12 12 -12" stroke="#86efac" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M58 22 c7 -6 15 -5 17 -2 c-4 6 -12 7 -17 2z" fill="#86efac" />
      <path d="M55 26 c-6 -5 -12 -3 -13 0 c4 4 10 4 13 0z" fill="#4ade80" />
    </g>
  ),
  paper_pioneer: (p) => ( // a flag planted on a mountain of paper
    <g>
      <path d="M22 76 H78 L71 66 H29Z" fill={p.cream} />
      <path d="M28 64 H72 L65 54 H35Z" fill={p.cream} opacity={0.8} />
      <path d="M34 52 H66 L59 43 H41Z" fill={p.cream} opacity={0.6} />
      <line x1={50} y1={44} x2={50} y2={16} stroke={p.cream} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M50 17 L69 23 L50 30Z" fill={RED} />
    </g>
  ),
  first_points: (p) => ( // the first spark of XP
    <g>
      <circle cx={50} cy={50} r={20} fill={GOLD} opacity={0.18} />
      <path d="M50 22 L55.5 44.5 L78 50 L55.5 55.5 L50 78 L44.5 55.5 L22 50 L44.5 44.5Z" fill={GOLD} />
      <path d="M50 34 L52.5 47.5 L66 50 L52.5 52.5 L50 66 L47.5 52.5 L34 50 L47.5 47.5Z" fill={p.cream} />
      <path d="M72 24 v8 M68 28 h8" stroke={p.cream} strokeWidth={2} strokeLinecap="round" />
      <circle cx={28} cy={72} r={2.2} fill={p.cream} />
    </g>
  ),

  // CADET — building momentum
  quiz_five: (p) => ( // a winning hand of five cards
    <g>
      {[-32, -16, 0, 16, 32].map((d, i) => (
        <g key={d} transform={`rotate(${d} 50 78)`}>
          <rect x={42} y={30} width={16} height={34} rx={2.5} fill={p.cream} stroke={p.inner[1]} strokeWidth={1.4} />
          {i === 4 && <circle cx={50} cy={47} r={4} fill={RED} />}
        </g>
      ))}
    </g>
  ),
  halfway_there: (p) => ( // the midpoint of the climb
    <g>
      <path d="M18 76 L50 26 L82 76Z" fill={p.accent} opacity={0.35} />
      <path d="M50 26 L42 38 L47 36 L50 40 L53 36 L58 38Z" fill={p.cream} />
      <path d="M26 76 Q46 66 40 57 T53 43" stroke={p.cream} strokeWidth={2.2} fill="none" strokeDasharray="3.5 3" strokeLinecap="round" />
      <line x1={40} y1={57} x2={40} y2={43} stroke={p.cream} strokeWidth={2} />
      <path d="M40 43 L51 46.5 L40 50Z" fill={RED} />
      <circle cx={26} cy={76} r={2.4} fill={p.cream} />
    </g>
  ),
  rising_scholar: (p) => ( // a cap rising like the dawn
    <g>
      {[-60, -30, 0, 30, 60].map((d) => (
        <line key={d} x1={50} y1={68} x2={50} y2={44} stroke={GOLD} strokeWidth={2.2} strokeLinecap="round" transform={`rotate(${d} 50 68)`} opacity={0.7} />
      ))}
      <path d="M33 68 a17 17 0 0 1 34 0z" fill={GOLD} />
      <line x1={22} y1={68} x2={78} y2={68} stroke={p.cream} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M50 22 L74 31 L50 40 L26 31Z" fill={p.cream} />
      <path d="M37 35 v7 c0 3 6 5.5 13 5.5 s13 -2.5 13 -5.5 v-7" fill={p.cream} opacity={0.75} />
      <path d="M72 31 v11" stroke={GOLD} strokeWidth={1.8} />
      <circle cx={72} cy={43} r={2} fill={GOLD} />
    </g>
  ),

  // APPRENTICE — getting good
  quiz_ten: (p) => ( // ten rungs to the star
    <g>
      <line x1={36} y1={80} x2={45} y2={26} stroke={p.cream} strokeWidth={3} strokeLinecap="round" />
      <line x1={57} y1={80} x2={66} y2={26} stroke={p.cream} strokeWidth={3} strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        const y = 74 - t * 42;
        return <line key={i} x1={37 + t * 7.2} y1={y} x2={58 + t * 7.2} y2={y} stroke={p.cream} strokeWidth={2.2} strokeLinecap="round" opacity={0.9} />;
      })}
      <path d={star5(56, 17, 8)} fill={GOLD} />
    </g>
  ),
  perfect_quiz: (p) => ( // an arrow dead-centre
    <g>
      <circle cx={46} cy={54} r={24} fill={RED} />
      <circle cx={46} cy={54} r={17} fill={p.cream} />
      <circle cx={46} cy={54} r={10} fill={RED} />
      <circle cx={46} cy={54} r={3.5} fill={p.cream} />
      <line x1={78} y1={22} x2={48} y2={52} stroke={p.cream} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M78 22 L70 21 L74 26Z M78 22 L79 30 L74 26Z" fill={GOLD} />
    </g>
  ),
  solid_scorer: (p) => ( // a score carved in stone
    <g>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`${row}-${col}`} x={24 + col * 18 + (row % 2) * 9 - (row % 2 ? 9 : 0)} y={36 + row * 14} width={16} height={12} rx={2}
            fill={p.accent} opacity={0.3 + row * 0.12} />
        ))
      )}
      <path d="M34 56 L45 67 L68 42" stroke={p.cream} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),

  // EXPLORER — seeing further
  quiz_fifteen: (p) => ( // the telescope toward new stars
    <g>
      <path d="M26 58 L64 36 L69 45 L31 67Z" fill={p.cream} />
      <path d="M64 36 L72 31 L77 40 L69 45Z" fill={p.accent} />
      <path d="M23 60 L27 58 L32 67 L28 69Z" fill={p.accent} />
      <path d="M49 54 L40 80 M49 54 L50 80 M49 54 L60 80" stroke={p.cream} strokeWidth={2.4} strokeLinecap="round" />
      <path d={star5(78, 20, 5)} fill={GOLD} />
      <circle cx={66} cy={18} r={1.8} fill={p.cream} />
      <circle cx={84} cy={32} r={1.4} fill={p.cream} />
    </g>
  ),
  strong_scorer: (p) => ( // standing above the clouds
    <g>
      <path d="M16 72 L40 40 L56 72Z" fill={p.accent} opacity={0.4} />
      <path d="M32 72 L56 26 L84 72Z" fill={p.cream} opacity={0.9} />
      <path d="M56 26 L50 37 L55 35 L58 39 L61 35 L63 37Z" fill={p.inner[0]} opacity={0.5} />
      <line x1={56} y1={27} x2={56} y2={12} stroke={p.cream} strokeWidth={2} />
      <path d="M56 12 L67 15.5 L56 19Z" fill={RED} />
      <ellipse cx={34} cy={74} rx={16} ry={5} fill={p.cream} opacity={0.55} />
      <ellipse cx={64} cy={77} rx={18} ry={5} fill={p.cream} opacity={0.45} />
    </g>
  ),
  triple_perfect: (p) => ( // three perfect stars in a line of sight
    <g>
      <path d="M28 64 L50 36 L72 64" stroke={p.accent} strokeWidth={1.6} fill="none" strokeDasharray="3 3" />
      <path d={star5(28, 64, 9)} fill={GOLD} />
      <path d={star5(50, 36, 12)} fill={GOLD} />
      <path d={star5(72, 64, 9)} fill={GOLD} />
      <circle cx={50} cy={36} r={17} fill={GOLD} opacity={0.15} />
    </g>
  ),

  // EXPERT — mastery shows
  quiz_master: (p) => ( // the owl of wisdom
    <g>
      <path d="M28 30 L36 42 L30 44Z M72 30 L64 42 L70 44Z" fill={p.cream} />
      <path d="M30 46 c0 -12 9 -18 20 -18 s20 6 20 18 v14 c0 11 -9 18 -20 18 s-20 -7 -20 -18z" fill={p.cream} />
      <circle cx={41} cy={48} r={8.5} fill={GOLD} />
      <circle cx={59} cy={48} r={8.5} fill={GOLD} />
      <circle cx={41} cy={48} r={4} fill={p.inner[1]} />
      <circle cx={59} cy={48} r={4} fill={p.inner[1]} />
      <circle cx={42.5} cy={46.5} r={1.3} fill="#fff" />
      <circle cx={60.5} cy={46.5} r={1.3} fill="#fff" />
      <path d="M50 54 L46 60 L54 60Z" fill="#f97316" />
      <path d="M38 66 q12 6 24 0" stroke={p.inner[0]} strokeWidth={1.6} fill="none" opacity={0.5} />
    </g>
  ),
  high_scorer: (p) => ( // an eagle riding the updraft
    <g>
      <path d="M50 46 C40 36 28 33 16 38 C27 41 34 45 38 51 C31 51 25 53 20 58 C32 58 41 58 47 55 L50 70 L53 55 C59 58 68 58 80 58 C75 53 69 51 62 51 C66 45 73 41 84 38 C72 33 60 36 50 46Z" fill={p.cream} />
      <circle cx={50} cy={42} r={5} fill={p.cream} />
      <path d="M54 42 L59 44 L54 45Z" fill={GOLD} />
      <circle cx={51.5} cy={41} r={1} fill={p.inner[1]} />
    </g>
  ),
  paper_ten: (p) => ( // ten papers fanned into an archive
    <g>
      {Array.from({ length: 10 }, (_, i) => -54 + i * 12).map((d, i) => (
        <rect key={d} x={45} y={24} width={10} height={46} rx={1.5} fill={i % 2 ? p.cream : p.accent}
          stroke={p.inner[1]} strokeWidth={0.8} transform={`rotate(${d} 50 72)`} />
      ))}
      <circle cx={50} cy={72} r={5} fill={GOLD} stroke={p.inner[1]} strokeWidth={1.2} />
    </g>
  ),

  // ELITE — rare feats
  perfect_ten: (p) => ( // a flawless diamond
    <g>
      <path d="M30 42 L40 29 H60 L70 42 L50 76Z" fill={p.accent} />
      <path d="M30 42 H70 L50 76Z" fill={p.cream} opacity={0.35} />
      <path d="M40 29 L45 42 L50 29 L55 42 L60 29" fill="none" stroke={p.inner[0]} strokeWidth={1.2} />
      <path d="M45 42 L50 76 L55 42" fill="none" stroke={p.inner[0]} strokeWidth={1.2} />
      <path d="M40 29 L45 42 L30 42Z" fill={p.cream} opacity={0.7} />
      <path d="M72 22 v8 M68 26 h8" stroke={p.cream} strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  consistent_ace: (p) => ( // three aces, never a bad hand
    <g>
      {[-18, 0, 18].map((d, i) => (
        <g key={d} transform={`rotate(${d} 50 80)`}>
          <rect x={37} y={28} width={26} height={38} rx={3} fill={p.cream} stroke={GOLD} strokeWidth={1.6} />
          {i === 1 && (
            <g>
              <path d="M50 38 C44 45 40 48 40 52 a5 5 0 0 0 9 3 L47 60 H53 L51 55 a5 5 0 0 0 9 -3 C60 48 56 45 50 38Z" fill={p.inner[1]} />
            </g>
          )}
        </g>
      ))}
    </g>
  ),
  xp_2000: (p) => ( // a comet that won't slow down
    <g>
      <path d="M72 28 C58 38 40 52 22 74 C42 60 56 52 68 44Z" fill={GOLD} opacity={0.45} />
      <path d="M71 30 C60 40 48 50 34 66 C48 56 58 50 67 43Z" fill={p.cream} opacity={0.7} />
      <circle cx={70} cy={32} r={11} fill={GOLD} opacity={0.3} />
      <circle cx={70} cy={32} r={7} fill={p.cream} />
      <circle cx={28} cy={30} r={1.8} fill={p.cream} />
      <circle cx={38} cy={22} r={1.2} fill={p.cream} />
      <path d={star5(80, 62, 4)} fill={p.cream} />
    </g>
  ),

  // MASTER — few ever get here
  quiz_fifty: (p) => ( // a fortress built from answers
    <g>
      <path d="M24 78 V46 h6 v-6 h6 v6 h6 V36 h16 v10 h6 v-6 h6 v6 h6 V78Z" fill={p.cream} />
      <path d="M43 78 V64 a7 7 0 0 1 14 0 V78Z" fill={p.inner[1]} />
      <rect x={31} y={54} width={5} height={7} rx={1} fill={p.inner[1]} opacity={0.7} />
      <rect x={64} y={54} width={5} height={7} rx={1} fill={p.inner[1]} opacity={0.7} />
      <line x1={50} y1={36} x2={50} y2={20} stroke={p.cream} strokeWidth={2} />
      <path d="M50 20 L62 24 L50 28Z" fill={RED} />
    </g>
  ),
  ace_collection: (p) => ( // a chest overflowing with top scores
    <g>
      <path d="M40 40 L45 33 L50 40 L45 47Z" fill="#60a5fa" />
      <path d="M50 38 L56 30 L62 38 L56 46Z" fill={RED} />
      <path d="M58 42 L62 37 L66 42 L62 47Z" fill="#34d399" />
      <path d="M28 50 a22 12 0 0 1 44 0z" fill="#d97706" />
      <rect x={28} y={50} width={44} height={26} rx={2} fill="#b45309" />
      <rect x={28} y={56} width={44} height={4} fill={GOLD} />
      <rect x={45} y={52} width={10} height={12} rx={2} fill={GOLD} stroke="#92400e" strokeWidth={1} />
      <circle cx={50} cy={58} r={1.8} fill="#92400e" />
      <path d="M72 30 v7 M68.5 33.5 h7" stroke={p.cream} strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  paper_machine: (p) => ( // the machine that runs on papers
    <g>
      <path d={gear(42, 56, 17, 8)} fill={p.cream} />
      <circle cx={42} cy={56} r={6} fill={p.inner[1]} />
      <path d={gear(66, 36, 11, 7)} fill={p.accent} />
      <circle cx={66} cy={36} r={4} fill={p.inner[1]} />
      <path d="M60 60 L80 60 L80 82 L60 82Z" fill={p.cream} transform="rotate(-12 70 71)" />
      <path d="M64 67 h12 M64 72 h12 M64 77 h8" stroke={p.inner[0]} strokeWidth={1.4} transform="rotate(-12 70 71)" />
    </g>
  ),

  // CHAMPION — the legends
  quiz_century: (p) => ( // a lighthouse that guides the batch
    <g>
      <path d="M50 34 L16 22 L16 40Z M50 34 L84 22 L84 40Z" fill={GOLD} opacity={0.4} />
      <ellipse cx={50} cy={80} rx={20} ry={5} fill={p.inner[0]} />
      <path d="M42 78 L46 40 H54 L58 78Z" fill={p.cream} />
      <path d="M43.2 66 H56.8 L57.6 72 H42.4Z M44.6 52 H55.4 L56.1 58 H43.9Z" fill={RED} />
      <rect x={44} y={30} width={12} height={10} rx={1.5} fill={GOLD} />
      <path d="M42 30 L50 22 L58 30Z" fill={RED} />
    </g>
  ),
  perfect_paper: (p) => ( // a golden quill signs a perfect paper
    <g>
      <rect x={26} y={44} width={40} height={30} rx={2} fill={p.cream} />
      <circle cx={26} cy={59} r={4} fill={p.accent} />
      <circle cx={66} cy={59} r={4} fill={p.accent} />
      <path d="M32 52 h24 M32 58 h28 M32 64 h18" stroke={p.inner[0]} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      <path d="M80 18 C66 22 56 36 50 60 C60 44 70 34 82 28 C74 28 70 30 66 32 C72 26 76 22 80 18Z" fill={GOLD} />
      <path d="M50 60 L58 42" stroke="#92400e" strokeWidth={1.4} />
      <path d="M54 66 l4 4 l8 -9" stroke={RED} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  legend: () => ( // the phoenix — rising every time
    <g>
      <path d="M50 58 C38 50 24 44 14 26 C28 34 36 36 42 40 C34 30 32 20 34 12 C42 26 46 36 50 46 C54 36 58 26 66 12 C68 20 66 30 58 40 C64 36 72 34 86 26 C76 44 62 50 50 58Z" fill={GOLD} />
      <path d="M50 56 C44 50 36 46 30 38 C38 42 44 44 48 46 C46 40 46 34 48 28 C50 36 50 42 50 48 C50 42 50 36 52 28 C54 34 54 40 52 46 C56 44 62 42 70 38 C64 46 56 50 50 56Z" fill={RED} />
      <circle cx={50} cy={60} r={6} fill={GOLD} />
      <path d="M50 64 C44 72 44 80 50 88 C56 80 56 72 50 64Z" fill={RED} />
      <path d="M50 66 C47 72 47 78 50 83 C53 78 53 72 50 66Z" fill={GOLD} />
    </g>
  )
};

function FallbackArt(p: Palette) {
  return <path d={star5(50, 52, 22)} fill={p.cream} />;
}

/* ── component ───────────────────────────────────────────────────── */

type Props = {
  achKey: string;
  tier: string;
  unlocked?: boolean;
  size?: number;
  className?: string;
  title?: string;
};

export function AchievementBadge({ achKey, tier, unlocked = true, size = 64, className = '', title }: Props) {
  const uid = useId().replace(/:/g, '');
  const p = TIERS[tier] ?? TIERS.novice;
  const shape = SHAPES[tier] ?? SHAPES.novice;
  const scale = ART_SCALE[tier] ?? 0.85;
  const art = (ART[achKey] ?? FallbackArt)(p);
  const shiftY = tier === 'champion' ? 4 : tier === 'cadet' ? 2 : 0;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? achKey}
      style={unlocked ? undefined : { filter: 'grayscale(1)', opacity: 0.45 }}
    >
      <defs>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.rim[0]} />
          <stop offset="100%" stopColor={p.rim[1]} />
        </linearGradient>
        <radialGradient id={`inner-${uid}`} cx="40%" cy="32%" r="75%">
          <stop offset="0%" stopColor={p.inner[0]} />
          <stop offset="100%" stopColor={p.inner[1]} />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape} transform="translate(50 50) scale(.82) translate(-50 -50)" />
        </clipPath>
      </defs>

      {tier === 'champion' && <Crown />}
      {tier === 'master' && <Laurel color={GOLD} />}

      {/* rim */}
      <path d={shape} fill={`url(#rim-${uid})`} stroke="rgba(0,0,0,0.25)" strokeWidth={1.2} />
      {/* face */}
      <path d={shape} transform="translate(50 50) scale(.82) translate(-50 -50)" fill={`url(#inner-${uid})`} />

      {/* the story */}
      <g clipPath={`url(#clip-${uid})`}>
        <g transform={`translate(50 ${50 + shiftY}) scale(${scale}) translate(-50 -50)`}>{art}</g>
        {/* glassy shine across the face */}
        <path d="M0 0 H100 V38 C70 48 30 30 0 44Z" fill="#fff" opacity={0.08} />
      </g>

      {!unlocked && (
        <g>
          <circle cx={78} cy={78} r={12} fill="#27272a" stroke="#fff" strokeWidth={2.5} />
          <rect x={72.5} y={77} width={11} height={8.5} rx={1.6} fill="#fff" />
          <path d="M74.8 77 v-2.6 a3.2 3.2 0 0 1 6.4 0 V77" stroke="#fff" strokeWidth={1.8} fill="none" />
        </g>
      )}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Rank emblems — one insignia per rank, in the same materials as the
   achievement medals so the two read as one family. Ranks get a heavier
   rim and a glow in the tier colour so they outrank a medal visually.
   ════════════════════════════════════════════════════════════════════ */

const RANK_ART: Record<string, Art> = {
  novice: (p) => ( // a seedling: every journey starts small
    <g>
      <path d="M26 72 Q50 62 74 72 L74 78 L26 78Z" fill={p.accent} opacity={0.55} />
      <path d="M50 72 V42" stroke={p.cream} strokeWidth={4} strokeLinecap="round" />
      <path d="M50 52 C39 52 30 46 27 34 C39 34 48 41 50 52Z" fill="#86efac" />
      <path d="M50 44 C60 44 69 37 72 25 C60 25 52 32 50 44Z" fill="#4ade80" />
    </g>
  ),
  cadet: (p) => ( // two chevrons earned, a star to aim for
    <g>
      <path d={star5(50, 26, 9)} fill={GOLD} />
      <path d="M26 54 L50 40 L74 54" stroke={p.cream} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 72 L50 58 L74 72" stroke={p.cream} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  apprentice: (p) => ( // the open book and the flame of learning
    <g>
      <path d="M50 24 C57 31 59 38 50 45 C41 38 43 31 50 24Z" fill={GOLD} />
      <path d="M50 32 C53 35 54 39 50 42 C46 39 47 35 50 32Z" fill={RED} />
      <path d="M50 50 C41 44 31 44 22 46 V74 C31 72 41 72 50 78Z" fill={p.cream} />
      <path d="M50 50 C59 44 69 44 78 46 V74 C69 72 59 72 50 78Z" fill={p.cream} opacity={0.82} />
      <path d="M28 54 C34 53 40 53 45 55 M28 61 C34 60 40 60 45 62 M55 55 C60 53 66 53 72 54 M55 62 C60 60 66 60 72 61"
        stroke={p.inner[0]} strokeWidth={1.4} fill="none" opacity={0.55} />
    </g>
  ),
  explorer: (p) => ( // the compass that points past the map
    <g>
      <circle cx={50} cy={50} r={27} fill="none" stroke={p.accent} strokeWidth={2.2} opacity={0.8} />
      <circle cx={50} cy={50} r={20} fill="none" stroke={p.accent} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
      <path d="M22 50 L50 45 L78 50 L50 55Z" fill={p.accent} />
      <path d="M50 20 L56 50 L44 50Z" fill={RED} />
      <path d="M50 80 L56 50 L44 50Z" fill={p.cream} />
      <circle cx={50} cy={50} r={4} fill={GOLD} />
    </g>
  ),
  expert: (p) => ( // knowledge in motion
    <g>
      {[0, 60, 120].map((d) => (
        <ellipse key={d} cx={50} cy={50} rx={30} ry={10.5} fill="none" stroke={p.cream} strokeWidth={2.6} transform={`rotate(${d} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={7} fill={GOLD} />
      <circle cx={80} cy={50} r={3.4} fill={p.accent} />
      <circle cx={35} cy={24} r={3.4} fill={p.accent} />
      <circle cx={35} cy={76} r={3.4} fill={p.accent} />
    </g>
  ),
  elite: (p) => ( // a star that has grown wings
    <g>
      <path d="M42 52 C32 42 20 40 10 45 C20 47 27 51 30 56 C23 56 18 58 13 63 C25 63 34 61 41 58Z" fill={p.cream} />
      <path d="M58 52 C68 42 80 40 90 45 C80 47 73 51 70 56 C77 56 82 58 87 63 C75 63 66 61 59 58Z" fill={p.cream} />
      <circle cx={50} cy={52} r={19} fill={GOLD} opacity={0.2} />
      <path d={star5(50, 52, 17)} fill={GOLD} stroke="#92400e" strokeWidth={1} strokeLinejoin="round" />
    </g>
  ),
  master: (p) => ( // the radiant sigil of mastery
    <g>
      {Array.from({ length: 12 }, (_, i) => i * 30).map((d) => (
        <path key={d} d="M50 50 L47.5 18 L50 12 L52.5 18Z" fill={GOLD} opacity={d % 60 === 0 ? 0.9 : 0.45} transform={`rotate(${d} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={17} fill={p.inner[1]} stroke={GOLD} strokeWidth={2.5} />
      <path d={star5(50, 50, 12)} fill={p.cream} />
    </g>
  ),
  champion: (p) => ( // the winged trophy — the top of the mountain
    <g>
      <path d="M36 40 C26 34 16 34 10 40 C18 41 24 44 27 48 C21 49 17 52 14 56 C24 55 31 52 36 48Z" fill={p.cream} opacity={0.9} />
      <path d="M64 40 C74 34 84 34 90 40 C82 41 76 44 73 48 C79 49 83 52 86 56 C76 55 69 52 64 48Z" fill={p.cream} opacity={0.9} />
      <path d="M36 32 C28 32 28 46 37 47" stroke={GOLD} strokeWidth={3.2} fill="none" />
      <path d="M64 32 C72 32 72 46 63 47" stroke={GOLD} strokeWidth={3.2} fill="none" />
      <path d="M36 26 H64 V38 C64 50 57 57 50 58 C43 57 36 50 36 38Z" fill={GOLD} stroke="#92400e" strokeWidth={1.2} />
      <circle cx={50} cy={40} r={4.5} fill={RED} stroke="#fde68a" strokeWidth={1.2} />
      <rect x={46.5} y={58} width={7} height={9} fill={GOLD} />
      <rect x={38} y={67} width={24} height={7} rx={2} fill={GOLD} stroke="#92400e" strokeWidth={1} />
    </g>
  )
};

type RankEmblemProps = {
  rankKey: string;
  size?: number;
  /** Ranks the student hasn't reached yet render drained of colour. */
  locked?: boolean;
  className?: string;
  title?: string;
};

export function RankEmblem({ rankKey, size = 96, locked = false, className = '', title }: RankEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const p = TIERS[rankKey] ?? TIERS.novice;
  const shape = SHAPES[rankKey] ?? SHAPES.novice;
  const art = (RANK_ART[rankKey] ?? FallbackArt)(p);
  const scale = (ART_SCALE[rankKey] ?? 0.85) * 0.95;
  const shiftY = rankKey === 'champion' ? 4 : rankKey === 'cadet' ? 2 : 0;
  const face = 'translate(50 50) scale(.76) translate(-50 -50)';

  return (
    <svg
      viewBox="-6 -6 112 112"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? `${rankKey} rank`}
      style={locked ? { filter: 'grayscale(1)', opacity: 0.4 } : undefined}
    >
      <defs>
        <linearGradient id={`rrim-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.rim[0]} />
          <stop offset="55%" stopColor={p.rim[1]} />
          <stop offset="100%" stopColor={p.rim[0]} />
        </linearGradient>
        <radialGradient id={`rface-${uid}`} cx="42%" cy="30%" r="78%">
          <stop offset="0%" stopColor={p.inner[0]} />
          <stop offset="100%" stopColor={p.inner[1]} />
        </radialGradient>
        <filter id={`rglow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <clipPath id={`rclip-${uid}`}>
          <path d={shape} transform={face} />
        </clipPath>
      </defs>

      {!locked && <path d={shape} fill={p.rim[1]} opacity={0.55} filter={`url(#rglow-${uid})`} />}
      {rankKey === 'champion' && <Crown />}
      {rankKey === 'master' && <Laurel color={GOLD} />}

      {/* heavy double rim */}
      <path d={shape} fill={`url(#rrim-${uid})`} stroke="rgba(0,0,0,0.3)" strokeWidth={1.4} />
      <path d={shape} transform="translate(50 50) scale(.88) translate(-50 -50)" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.4} />
      <path d={shape} transform={face} fill={`url(#rface-${uid})`} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />

      <g clipPath={`url(#rclip-${uid})`}>
        <g transform={`translate(50 ${50 + shiftY}) scale(${scale}) translate(-50 -50)`}>{art}</g>
        <path d="M0 0 H100 V36 C70 46 30 28 0 42Z" fill="#fff" opacity={0.09} />
      </g>
    </svg>
  );
}
