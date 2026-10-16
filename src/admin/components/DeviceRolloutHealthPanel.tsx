import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  LayersIcon,
  Loader2Icon,
  RotateCcwIcon,
  ShieldAlertIcon,
  UsersIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Rollout = {
  id: string;
  batch_name: string;
  enrolled_count: number;
  status: 'active' | 'rolled_back';
  created_at: string;
};

type SecurityRow = {
  student_id: string;
  rollout_id: string | null;
  pilot_source: 'individual' | 'cohort';
  status: 'active' | 'locked';
  locked_at: string | null;
  student: {
    full_name: string | null;
    student_code: string | null;
  } | null;
};

type RequestRow = {
  student_id: string;
  status: 'pending' | 'contacted';
};

type StudentHealth = {
  id: string;
  name: string;
  code: string;
  rolloutId: string | null;
  source: 'individual' | 'cohort';
  locked: boolean;
  hasRequest: boolean;
  devices: number;
  lockedAt: string | null;
};

const shortDate = (value: string) => new Date(value).toLocaleDateString('en-LK', {
  day: 'numeric', month: 'short', year: 'numeric'
});

export function DeviceRolloutHealthPanel({ maxDevices }: { maxDevices: number }) {
  const [rollouts, setRollouts] = useState<Rollout[]>([]);
  const [securityRows, setSecurityRows] = useState<SecurityRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Map<string, number>>(new Map());
  const [restoredThisWeek, setRestoredThisWeek] = useState(0);
  const [selectedRollout, setSelectedRollout] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [rolloutResult, securityResult, requestResult, deviceResult, recoveryResult] = await Promise.all([
      supabase.from('device_rollout_cohorts').select('id,batch_name,enrolled_count,status,created_at').order('created_at', { ascending: false }),
      supabase
        .from('student_device_security')
        .select('student_id,rollout_id,pilot_source,status,locked_at,student:profiles!student_id(full_name,student_code)')
        .eq('pilot_enabled', true),
      supabase.from('device_access_requests').select('student_id,status').in('status', ['pending', 'contacted']),
      supabase.from('student_devices').select('student_id').eq('lifecycle_status', 'active'),
      supabase.from('device_security_events').select('id', { count: 'exact', head: true }).eq('action', 'access_restored').gte('created_at', sevenDaysAgo)
    ]);

    if (rolloutResult.error || securityResult.error || requestResult.error || deviceResult.error) {
      setError('Rollout health data is unavailable. Apply the latest device-security migrations, then refresh.');
    } else {
      const counts = new Map<string, number>();
      (deviceResult.data ?? []).forEach((row) => counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1));
      setRollouts((rolloutResult.data ?? []) as Rollout[]);
      setSecurityRows((securityResult.data ?? []) as unknown as SecurityRow[]);
      setRequests((requestResult.data ?? []) as RequestRow[]);
      setDeviceCounts(counts);
      setRestoredThisWeek(recoveryResult.count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-device-rollout-health')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_device_security' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_access_requests' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_devices' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_rollout_cohorts' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const students = useMemo<StudentHealth[]>(() => {
    const openRequests = new Set(requests.map((request) => request.student_id));
    return securityRows.map((row) => ({
      id: row.student_id,
      name: row.student?.full_name || 'Unnamed student',
      code: row.student?.student_code || 'No ID',
      rolloutId: row.rollout_id,
      source: row.pilot_source,
      locked: row.status === 'locked',
      hasRequest: openRequests.has(row.student_id),
      devices: deviceCounts.get(row.student_id) ?? 0,
      lockedAt: row.locked_at
    })).sort((a, b) => Number(b.hasRequest) - Number(a.hasRequest) || Number(b.locked) - Number(a.locked) || a.name.localeCompare(b.name));
  }, [deviceCounts, requests, securityRows]);

  const activeRollouts = rollouts.filter((rollout) => rollout.status === 'active');
  const visibleStudents = selectedRollout === 'all'
    ? students
    : selectedRollout === 'individual'
      ? students.filter((student) => student.source === 'individual')
      : students.filter((student) => student.rolloutId === selectedRollout);
  const locked = visibleStudents.filter((student) => student.locked).length;
  const openRequests = visibleStudents.filter((student) => student.hasRequest).length;
  const healthy = visibleStudents.length - locked;
  const lockRate = visibleStudents.length ? (locked / visibleStudents.length) * 100 : 0;
  const requestRate = visibleStudents.length ? (openRequests / visibleStudents.length) * 100 : 0;
  const needsPauseReview = visibleStudents.length > 0 && lockRate >= 5;
  const selectedLabel = selectedRollout === 'all'
    ? 'All enrolled students'
    : selectedRollout === 'individual'
      ? 'Individual pilots'
      : activeRollouts.find((rollout) => rollout.id === selectedRollout)?.batch_name || 'Selected cohort';

  if (loading) {
    return <div className="mb-6 flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2Icon className="h-6 w-6 animate-spin text-slate-300" /></div>;
  }

  if (error) {
    return <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{error}</div>;
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ActivityIcon className="h-5 w-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900">Rollout health</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Monitor enforcement outcomes before expanding to another group.</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><RotateCcwIcon className="h-3.5 w-3.5" /> {restoredThisWeek} access restoration{restoredThisWeek === 1 ? '' : 's'} in 7 days</div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Enrolled', value: visibleStudents.length, detail: selectedLabel, icon: UsersIcon, tone: 'text-slate-600 bg-slate-100' },
          { label: 'Healthy now', value: healthy, detail: `${visibleStudents.length ? Math.round((healthy / visibleStudents.length) * 100) : 100}% of selection`, icon: CheckCircle2Icon, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Locked', value: locked, detail: `${lockRate.toFixed(1)}% lock rate`, icon: ShieldAlertIcon, tone: locked ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100' },
          { label: 'Open requests', value: openRequests, detail: `${requestRate.toFixed(1)}% request rate`, icon: Clock3Icon, tone: openRequests ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100' }
        ].map((metric) => (
          <div key={metric.label} className="border-b border-slate-100 p-5 sm:p-6 xl:border-b-0 xl:border-r last:border-r-0">
            <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.tone}`}><metric.icon className="h-4 w-4" /></span></div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{metric.value}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </div>

      {needsPauseReview && (
        <div className="flex items-start gap-3 border-y border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 sm:px-6">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div><p className="font-bold">Review before expanding this rollout</p><p className="mt-0.5 text-amber-800">The lock rate is {lockRate.toFixed(1)}%, above the 5% safety threshold. Inspect affected students or use the emergency pause before enrolling another cohort.</p></div>
        </div>
      )}

      <div className="grid lg:grid-cols-[250px_1fr]">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Monitoring scope</p>
          <div className="space-y-1">
            <button type="button" onClick={() => setSelectedRollout('all')} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20 ${selectedRollout === 'all' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}><span>All enrolled</span><span className="tabular-nums text-xs text-slate-400">{students.length}</span></button>
            <button type="button" onClick={() => setSelectedRollout('individual')} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20 ${selectedRollout === 'individual' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}><span>Individual pilots</span><span className="tabular-nums text-xs text-slate-400">{students.filter((student) => student.source === 'individual').length}</span></button>
            {activeRollouts.map((rollout) => {
              const cohort = students.filter((student) => student.rolloutId === rollout.id);
              const cohortLocked = cohort.filter((student) => student.locked).length;
              return (
                <button key={rollout.id} type="button" onClick={() => setSelectedRollout(rollout.id)} className={`w-full rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20 ${selectedRollout === rollout.id ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70'}`}>
                  <span className={`block truncate text-sm font-semibold ${selectedRollout === rollout.id ? 'text-slate-900' : 'text-slate-600'}`}>{rollout.batch_name}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{cohort.length} active · {cohortLocked} locked</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cohort detail</p><h3 className="mt-1 font-bold text-slate-900">{selectedLabel}</h3></div>
            <p className="text-xs text-slate-500">Limit: {maxDevices} installations per student</p>
          </div>

          {visibleStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center"><LayersIcon className="mx-auto h-8 w-8 text-slate-200" /><p className="mt-2 text-sm font-semibold text-slate-700">No active students in this scope</p></div>
          ) : (
            <div className="max-h-[430px] overflow-y-auto rounded-xl border border-slate-200">
              {visibleStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50/70">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${student.hasRequest ? 'bg-amber-50 text-amber-600' : student.locked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {student.hasRequest ? <Clock3Icon className="h-4 w-4" /> : student.locked ? <ShieldAlertIcon className="h-4 w-4" /> : <CheckCircle2Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{student.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{student.code} · {student.devices}/{maxDevices} devices{student.lockedAt ? ` · Locked ${shortDate(student.lockedAt)}` : ''}</p></div>
                  <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:inline-flex ${student.hasRequest ? 'bg-amber-50 text-amber-700' : student.locked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{student.hasRequest ? 'Request' : student.locked ? 'Locked' : 'Healthy'}</span>
                  <Link to={`/admin/students/${student.id}?tab=devices`} aria-label={`Review ${student.name}'s devices`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-[#c20f24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20"><ArrowRightIcon className="h-4 w-4" /></Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
