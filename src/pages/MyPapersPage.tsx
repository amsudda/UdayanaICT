import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRightIcon,
  AwardIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  FileSearchIcon,
  FileTextIcon,
  RotateCcwIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type PaperType = 'all' | 'full' | 'timing';

type PaperMark = {
  id: string;
  title: string;
  paper_no: number | null;
  type: 'full' | 'timing';
  marks: number;
  max_marks: number;
  exam_date: string | null;
  created_at: string;
};

const FILTERS: Array<{ value: PaperType; label: string; short: string }> = [
  { value: 'all', label: 'All papers', short: 'All' },
  { value: 'full', label: 'Full papers', short: 'Full' },
  { value: 'timing', label: 'Timing papers', short: 'Timing' }
];

const percentageOf = (mark: PaperMark) =>
  mark.max_marks > 0 ? Math.max(0, Math.min(100, (Number(mark.marks) / Number(mark.max_marks)) * 100)) : 0;

const dateValue = (mark: PaperMark) => {
  const raw = mark.exam_date || mark.created_at;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const formatDate = (mark: PaperMark, compact = false) => {
  const raw = mark.exam_date || mark.created_at;
  if (!raw) return 'Date not recorded';
  const date = new Date(`${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-GB', compact
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const scoreTone = (score: number) => {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-[#c20f24] dark:text-red-400';
};

function ProgressChart({ marks }: { marks: PaperMark[] }) {
  const W = 760;
  const H = 280;
  const left = 42;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const x = (index: number) => marks.length <= 1
    ? left + plotW / 2
    : left + (index / (marks.length - 1)) * plotW;
  const y = (score: number) => top + (1 - score / 100) * plotH;
  const points = marks.map((mark, index) => `${x(index)},${y(percentageOf(mark))}`).join(' ');
  const area = marks.length > 1
    ? `${left},${top + plotH} ${points} ${x(marks.length - 1)},${top + plotH}`
    : '';
  const labelEvery = Math.max(1, Math.ceil(marks.length / 6));

  return (
    <div>
      <div className="pb-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          role="img"
          aria-label={`Performance chart for ${marks.length} marked ${marks.length === 1 ? 'paper' : 'papers'}`}
        >
          <defs>
            <linearGradient id="my-papers-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c20f24" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#c20f24" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={W - right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-slate-200 dark:stroke-slate-700/80"
                strokeDasharray={tick === 0 ? undefined : '4 6'}
              />
              <text x={left - 9} y={y(tick) + 4} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="10">
                {tick}%
              </text>
            </g>
          ))}

          {area && <polygon points={area} fill="url(#my-papers-area)" />}
          {marks.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="#c20f24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {marks.map((mark, index) => {
            const showLabel = index === 0 || index === marks.length - 1 || index % labelEvery === 0;
            return (
              <g key={mark.id}>
                <circle
                  cx={x(index)}
                  cy={y(percentageOf(mark))}
                  r="5"
                  fill={mark.type === 'timing' ? '#f59e0b' : '#c20f24'}
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <title>{`${mark.title}: ${percentageOf(mark).toFixed(1)}%`}</title>
                </circle>
                {showLabel && (
                  <text
                    x={x(index)}
                    y={H - 13}
                    textAnchor={index === 0 ? 'start' : index === marks.length - 1 ? 'end' : 'middle'}
                    className="fill-slate-400 dark:fill-slate-500"
                    fontSize="10"
                  >
                    {formatDate(mark, true)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#c20f24]" /> Full paper</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Timing paper</span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5" aria-label="Loading paper progress">
      <div className="h-36 animate-pulse rounded-[1.75rem] bg-white dark:bg-slate-900" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />)}
      </div>
      <div className="h-80 animate-pulse rounded-[1.75rem] bg-white dark:bg-slate-900" />
    </div>
  );
}

export function MyPapersPage() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [marks, setMarks] = useState<PaperMark[]>([]);
  const [filter, setFilter] = useState<PaperType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMarks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('paper_marks')
      .select('id, title, paper_no, type, marks, max_marks, exam_date, created_at')
      .eq('student_id', user.id)
      .order('exam_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (loadError) {
      setError('Your paper progress could not be loaded. Please try again.');
      setMarks([]);
    } else {
      setMarks(((data ?? []) as PaperMark[]).sort((a, b) => dateValue(a) - dateValue(b)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadMarks(); }, [loadMarks]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-paper-marks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paper_marks', filter: `student_id=eq.${user.id}` },
        () => { void loadMarks(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadMarks, user]);

  const filtered = useMemo(
    () => marks.filter((mark) => filter === 'all' || mark.type === filter),
    [filter, marks]
  );

  const summary = useMemo(() => {
    if (!filtered.length) return null;
    const scores = filtered.map(percentageOf);
    const latest = scores[scores.length - 1];
    const previousAverage = scores.length > 1
      ? scores.slice(0, -1).reduce((total, score) => total + score, 0) / (scores.length - 1)
      : null;
    const recent = scores.slice(-3);
    const recentAverage = recent.reduce((total, score) => total + score, 0) / recent.length;
    const early = scores.slice(0, Math.min(3, scores.length));
    const earlyAverage = early.reduce((total, score) => total + score, 0) / early.length;
    return {
      latest,
      latestDelta: previousAverage === null ? null : latest - previousAverage,
      recentAverage,
      overallShift: scores.length > 1 ? recentAverage - earlyAverage : null
    };
  }, [filtered]);

  const averagesByType = useMemo(() => {
    const averageFor = (type: PaperMark['type']) => {
      const scores = marks.filter((mark) => mark.type === type).map(percentageOf);
      return scores.length > 0
        ? scores.reduce((total, score) => total + score, 0) / scores.length
        : null;
    };
    return {
      full: averageFor('full'),
      timing: averageFor('timing')
    };
  }, [marks]);

  const fullCount = filtered.filter((mark) => mark.type === 'full').length;
  const timingCount = filtered.filter((mark) => mark.type === 'timing').length;
  const totalFullCount = marks.filter((mark) => mark.type === 'full').length;
  const totalTimingCount = marks.filter((mark) => mark.type === 'timing').length;
  const latestFirst = [...filtered].reverse();

  const container = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <section className="mx-auto max-w-3xl rounded-[1.75rem] border border-red-100 bg-white p-8 text-center dark:border-red-950/60 dark:bg-slate-900">
        <FileSearchIcon className="mx-auto h-10 w-10 text-red-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">We could not load My Papers</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => void loadMarks()}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#c20f24] px-4 text-sm font-bold text-white transition-colors hover:bg-[#a60d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24] focus-visible:ring-offset-2"
        >
          <RotateCcwIcon className="h-4 w-4" /> Try again
        </button>
      </section>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl pb-10">
      <motion.header variants={item} className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#c20f24]/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-[28%] h-px w-40 bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
              <BarChart3Icon className="h-4 w-4" /> Progress
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My Papers</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-[15px]">
              Your marked paper history, score movement, and separate averages for full and timing papers.
            </p>
          </div>
          <Link
            to="/dashboard/papers"
            className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Browse paper library <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </motion.header>

      <motion.div variants={item} className="mt-5 flex w-full gap-1 rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800 sm:w-fit" role="group" aria-label="Filter paper progress">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          const count = option.value === 'all' ? marks.length : marks.filter((mark) => mark.type === option.value).length;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={active}
              className={`min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors sm:flex-none sm:text-sm ${
                active
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span className="sm:hidden">{option.short}</span>
              <span className="hidden sm:inline">{option.label}</span>
              <span className={`ml-1.5 tabular-nums ${active ? 'text-[#c20f24] dark:text-red-400' : 'text-slate-400'}`}>{count}</span>
            </button>
          );
        })}
      </motion.div>

      {marks.length === 0 ? (
        <motion.section variants={item} className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900 sm:py-20">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#c20f24] dark:bg-red-950/30 dark:text-red-400">
            <FileTextIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">No marked papers yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Once your teacher records your first paper mark, your chart, paper-type averages, and complete history will appear here automatically.
          </p>
          <Link to="/dashboard/papers" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#c20f24] hover:text-[#9c0c1d]">
            Find a paper to practise <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </motion.section>
      ) : filtered.length === 0 ? (
        <motion.section variants={item} className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <FileSearchIcon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No {filter} papers marked yet</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your other paper results are still available under All papers.</p>
          <button type="button" onClick={() => setFilter('all')} className="mt-5 text-sm font-bold text-[#c20f24] hover:text-[#9c0c1d]">Show all papers</button>
        </motion.section>
      ) : summary && (
        <>
          <motion.section variants={item} className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Full paper average', value: averagesByType.full === null ? '—' : `${averagesByType.full.toFixed(1)}%`, icon: AwardIcon, tone: averagesByType.full === null ? 'text-slate-400' : scoreTone(averagesByType.full), note: `${totalFullCount} full ${totalFullCount === 1 ? 'paper' : 'papers'}` },
              { label: 'Timing paper average', value: averagesByType.timing === null ? '—' : `${averagesByType.timing.toFixed(1)}%`, icon: TargetIcon, tone: averagesByType.timing === null ? 'text-slate-400' : scoreTone(averagesByType.timing), note: `${totalTimingCount} timing ${totalTimingCount === 1 ? 'paper' : 'papers'}` },
              { label: 'Latest score', value: `${summary.latest.toFixed(1)}%`, icon: CalendarDaysIcon, tone: scoreTone(summary.latest), note: summary.latestDelta === null ? 'Your first result' : `${summary.latestDelta >= 0 ? '+' : ''}${summary.latestDelta.toFixed(1)} vs earlier average` },
              { label: 'Completed', value: String(filtered.length), icon: FileTextIcon, tone: 'text-slate-950 dark:text-white', note: `${fullCount} full · ${timingCount} timing` }
            ].map((stat) => (
              <article key={stat.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  <stat.icon className="h-3.5 w-3.5" /> {stat.label}
                </div>
                <p className={`mt-3 text-2xl font-black tabular-nums sm:text-3xl ${stat.tone}`}>{stat.value}</p>
                <p className="mt-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500" title={stat.note}>{stat.note}</p>
              </article>
            ))}
          </motion.section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
            <motion.section variants={item} className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Performance trend</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Every point is one paper, ordered by date.</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {FILTERS.find((option) => option.value === filter)?.label}
                </span>
              </div>
              <ProgressChart marks={filtered} />
            </motion.section>

            <motion.aside variants={item} className="space-y-4">
              <section className="rounded-[1.75rem] bg-[#c20f24] p-5 text-white">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
                  {summary.overallShift !== null && summary.overallShift < 0 ? <TrendingDownIcon className="h-4 w-4" /> : <TrendingUpIcon className="h-4 w-4" />}
                  Progress pulse
                </div>
                <p className="mt-4 text-3xl font-black tabular-nums">{summary.recentAverage.toFixed(1)}%</p>
                <p className="mt-1 text-sm font-semibold text-white/90">Recent average</p>
                <p className="mt-3 text-xs leading-5 text-white/65">
                  {summary.overallShift === null
                    ? 'Your next result will start showing a performance direction.'
                    : `${summary.overallShift >= 0 ? 'Up' : 'Down'} ${Math.abs(summary.overallShift).toFixed(1)} points compared with your starting papers.`}
                </p>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Paper mix</p>
                <div className="mt-4 space-y-4">
                  {[
                    { label: 'Full papers', count: fullCount, color: 'bg-[#c20f24]' },
                    { label: 'Timing papers', count: timingCount, color: 'bg-amber-500' }
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span>{row.label}</span><span className="tabular-nums">{row.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${filtered.length ? (row.count / filtered.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.aside>
          </div>

          <motion.section variants={item} className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-end justify-between gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Paper history</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Newest result first</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-slate-400">{filtered.length} total</span>
            </div>

            <div>
              {latestFirst.map((mark, index) => {
                const score = percentageOf(mark);
                const chronologicalIndex = filtered.findIndex((item) => item.id === mark.id);
                const previous = chronologicalIndex > 0 ? percentageOf(filtered[chronologicalIndex - 1]) : null;
                const delta = previous === null ? null : score - previous;
                return (
                  <article key={mark.id} className={`grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:items-center sm:px-6 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${mark.type === 'full' ? 'bg-red-50 text-[#c20f24] dark:bg-red-950/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                        <FileTextIcon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{mark.title}</h3>
                          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${mark.type === 'full' ? 'bg-red-50 text-[#c20f24] dark:bg-red-950/30 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
                            {mark.type}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {[mark.paper_no != null ? `Paper ${mark.paper_no}` : null, formatDate(mark)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="pl-[3.25rem] sm:pl-0 sm:text-right">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{Number(mark.marks).toLocaleString()} / {Number(mark.max_marks).toLocaleString()} marks</p>
                      {delta !== null && (
                        <p className={`mt-1 text-[11px] font-bold tabular-nums ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)} from previous
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pl-[3.25rem] sm:pl-0">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-[#c20f24]'}`} style={{ width: `${score}%` }} />
                      </div>
                      <span className={`w-12 text-right text-sm font-black tabular-nums ${scoreTone(score)}`}>{score.toFixed(1)}%</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        </>
      )}
    </motion.div>
  );
}
