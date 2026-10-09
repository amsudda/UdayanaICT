import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3Icon,
  ChevronDownIcon,
  FileTextIcon,
  Loader2Icon,
  TrophyIcon,
  UsersIcon,
  ZapIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Initials } from './ui';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Batch = {
  id: string;
  name: string;
  program?: string | null;
  exam_year?: string | number | null;
};

type RankingMode = 'papers' | 'xp';
type PaperType = 'all' | 'full' | 'timing';
type XpScope = 'weekly' | 'all_time';

type RankingRow = {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  position: number | null;
  score: number;
  count: number;
  best?: number;
};

function startOfUtcWeek() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString();
}

function assignPositions(rows: RankingRow[], mode: RankingMode) {
  const active = rows
    .filter((row) => row.count > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (mode === 'papers' && b.count !== a.count) return b.count - a.count;
      return a.displayName.localeCompare(b.displayName);
    });

  let previousKey = '';
  let previousPosition = 0;
  active.forEach((row, index) => {
    const key = mode === 'papers' ? `${row.score}:${row.count}` : String(row.score);
    if (key !== previousKey) previousPosition = index + 1;
    row.position = previousPosition;
    previousKey = key;
  });

  const inactive = rows
    .filter((row) => row.count === 0)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return [...active, ...inactive];
}

function rankTone(position: number | null) {
  if (position === 1) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (position === 2) return 'border-slate-200 bg-slate-100 text-slate-600';
  if (position === 3) return 'border-orange-200 bg-orange-50 text-orange-700';
  return 'border-slate-200 bg-white text-slate-500';
}

export function AdminBatchRankings({
  batches,
  studentId,
  studentName
}: {
  batches: Batch[];
  studentId: string;
  studentName: string;
}) {
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id ?? '');
  const [mode, setMode] = useState<RankingMode>('papers');
  const [paperType, setPaperType] = useState<PaperType>('all');
  const [xpScope, setXpScope] = useState<XpScope>('all_time');
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batches.some((batch) => batch.id === selectedBatchId)) {
      setSelectedBatchId(batches[0]?.id ?? '');
    }
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const loadRanking = async () => {
      setLoading(true);
      setError('');

      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('batch_members')
          .select('student_id')
          .eq('batch_id', selectedBatchId);

        if (membershipError) throw membershipError;

        const memberIds = Array.from(new Set((memberships ?? []).map((entry: any) => entry.student_id).filter(Boolean)));
        if (memberIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const profilesPromise = supabase
          .from('profiles')
          .select('id,full_name,avatar_url')
          .in('id', memberIds);

        let metricPromise;
        if (mode === 'papers') {
          let query = supabase
            .from('paper_marks')
            .select('student_id,marks,max_marks,type')
            .in('student_id', memberIds)
            .gt('max_marks', 0);
          if (paperType !== 'all') query = query.eq('type', paperType);
          metricPromise = query;
        } else {
          let query = supabase
            .from('xp_transactions')
            .select('student_id,amount,created_at')
            .in('student_id', memberIds);
          if (xpScope === 'weekly') query = query.gte('created_at', startOfUtcWeek());
          metricPromise = query;
        }

        const [{ data: profiles, error: profilesError }, { data: metrics, error: metricsError }] = await Promise.all([
          profilesPromise,
          metricPromise
        ]);

        if (profilesError) throw profilesError;
        if (metricsError) throw metricsError;

        const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
        const aggregates = new Map<string, { total: number; count: number; best: number }>();

        (metrics ?? []).forEach((metric: any) => {
          const current = aggregates.get(metric.student_id) ?? { total: 0, count: 0, best: 0 };
          if (mode === 'papers') {
            const maxMarks = Number(metric.max_marks);
            const percentage = maxMarks > 0 ? (Number(metric.marks) / maxMarks) * 100 : 0;
            current.total += percentage;
            current.best = Math.max(current.best, percentage);
          } else {
            current.total += Number(metric.amount) || 0;
          }
          current.count += 1;
          aggregates.set(metric.student_id, current);
        });

        const rankedRows = memberIds.map((memberId) => {
          const profile = profileMap.get(memberId) as any;
          const aggregate = aggregates.get(memberId) ?? { total: 0, count: 0, best: 0 };
          return {
            studentId: memberId,
            displayName: profile?.full_name || 'Student',
            avatarUrl: profile?.avatar_url || undefined,
            position: null,
            score: mode === 'papers' && aggregate.count > 0 ? aggregate.total / aggregate.count : aggregate.total,
            count: aggregate.count,
            best: mode === 'papers' ? aggregate.best : undefined
          } satisfies RankingRow;
        });

        if (!cancelled) setRows(assignPositions(rankedRows, mode));
      } catch (loadError: any) {
        if (!cancelled) {
          setRows([]);
          setError(loadError?.message || 'Unable to load this batch ranking.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRanking();
    return () => { cancelled = true; };
  }, [mode, paperType, selectedBatchId, xpScope]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);
  const currentStudent = rows.find((row) => row.studentId === studentId);
  const rankedCount = rows.filter((row) => row.position !== null).length;
  const currentMetric = useMemo(() => {
    if (!currentStudent || currentStudent.count === 0) return 'No activity';
    return mode === 'papers' ? `${currentStudent.score.toFixed(1)}% average` : `${currentStudent.score.toLocaleString()} XP`;
  }, [currentStudent, mode]);

  if (batches.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <UsersIcon className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-bold text-slate-900">No batch ranking available</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Add this student to a batch from the Access tab to compare their paper results and XP.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#c20f24]">
              <TrophyIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Batch rankings</h2>
              <p className="mt-0.5 text-[13px] text-slate-500">Compare {studentName} across each enrolled batch.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 sm:min-w-[220px]">
              <span className="sr-only">Select batch</span>
              <select
                value={selectedBatchId}
                onChange={(event) => setSelectedBatchId(event.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-[13px] font-semibold text-slate-700 transition focus:border-[#c20f24]/40 focus:ring-2 focus:ring-[#c20f24]/10"
              >
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}{batch.exam_year ? ` · ${batch.exam_year}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>

            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Ranking type">
              {([
                { value: 'papers', label: 'Papers', icon: FileTextIcon },
                { value: 'xp', label: 'XP', icon: ZapIcon }
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                    mode === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <option.icon className={`h-3.5 w-3.5 ${mode === option.value ? 'text-[#c20f24]' : ''}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{selectedBatch?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{rows.length} students</span>
            <span aria-hidden="true">·</span>
            <span>{rankedCount} ranked</span>
          </div>

          <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-0.5">
            {(mode === 'papers'
              ? [
                  { value: 'all', label: 'All papers' },
                  { value: 'full', label: 'Full' },
                  { value: 'timing', label: 'Timing' }
                ]
              : [
                  { value: 'all_time', label: 'All time' },
                  { value: 'weekly', label: 'This week' }
                ]
            ).map((option) => {
              const selected = mode === 'papers' ? paperType === option.value : xpScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => mode === 'papers' ? setPaperType(option.value as PaperType) : setXpScope(option.value as XpScope)}
                  className={`h-7 rounded-md px-2.5 text-[11px] font-bold transition-colors ${
                    selected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!loading && !error && currentStudent && (
        <div className="grid gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-3">
          <div className="bg-white px-5 py-4 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Student position</p>
            <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
              {currentStudent.position ? `#${currentStudent.position}` : 'Unranked'}
            </p>
          </div>
          <div className="bg-white px-5 py-4 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Current result</p>
            <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{currentMetric}</p>
          </div>
          <div className="bg-white px-5 py-4 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Records counted</p>
            <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{currentStudent.count}</p>
          </div>
        </div>
      )}

      <div className="min-h-[220px]">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2Icon className="h-5 w-5 animate-spin text-[#c20f24]" /> Loading rankings…
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <BarChart3Icon className="h-9 w-9 text-slate-200" />
            <p className="mt-3 font-semibold text-slate-900">Ranking could not be loaded</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
            <UsersIcon className="h-9 w-9 text-slate-200" />
            <p className="mt-3 font-semibold text-slate-900">This batch has no students</p>
            <p className="mt-1 text-sm text-slate-500">Add students to the batch to create a ranking.</p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <th className="w-20 px-5 py-3 sm:px-6">Rank</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">{mode === 'papers' ? 'Average' : 'XP earned'}</th>
                  <th className="hidden px-5 py-3 text-right sm:table-cell sm:px-6">{mode === 'papers' ? 'Best / papers' : 'Awards'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const isCurrent = row.studentId === studentId;
                  return (
                    <tr key={row.studentId} className={isCurrent ? 'bg-red-50/55' : 'bg-white hover:bg-slate-50/70'}>
                      <td className="px-5 py-3.5 sm:px-6">
                        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-black tabular-nums ${rankTone(row.position)}`}>
                          {row.position ? `#${row.position}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Initials name={row.displayName} src={row.avatarUrl} size={34} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{row.displayName}</p>
                            {isCurrent && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c20f24]">Current student</p>}
                            <p className="mt-1 text-xs tabular-nums text-slate-500 sm:hidden">
                              {row.count === 0
                                ? mode === 'papers' ? 'No marks' : 'No XP'
                                : mode === 'papers'
                                  ? `${row.score.toFixed(1)}% average · ${row.best?.toFixed(1)}% best · ${row.count} ${row.count === 1 ? 'paper' : 'papers'}`
                                  : `${row.score.toLocaleString()} XP · ${row.count} ${row.count === 1 ? 'award' : 'awards'}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 text-right font-black tabular-nums text-slate-900 sm:table-cell">
                        {row.count === 0 ? '—' : mode === 'papers' ? `${row.score.toFixed(1)}%` : row.score.toLocaleString()}
                      </td>
                      <td className="hidden px-5 py-3.5 text-right tabular-nums text-slate-500 sm:table-cell sm:px-6">
                        {mode === 'papers'
                          ? row.count > 0 ? `${row.best?.toFixed(1)}% / ${row.count}` : 'No marks'
                          : row.count > 0 ? row.count : 'No XP'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
