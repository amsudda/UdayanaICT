import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  LayersIcon,
  Loader2Icon,
  PauseCircleIcon,
  PlayCircleIcon,
  RocketIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  UsersIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';

type Batch = {
  id: string;
  name: string;
  program: string | null;
  exam_year: number | null;
};

type BatchMember = {
  student_id: string;
  student: { id: string; full_name: string | null; student_code: string | null } | null;
};

type Rollout = {
  id: string;
  batch_id: string;
  batch_name: string;
  requested_limit: number;
  enrolled_count: number;
  skipped_over_limit_count: number;
  status: 'active' | 'rolled_back';
  created_at: string;
  rolled_back_at: string | null;
};

type Preview = {
  total: number;
  eligible: number;
  alreadyPilot: number;
  overLimit: number;
  sample: Array<{ id: string; name: string; code: string }>;
};

const emptyPreview: Preview = { total: 0, eligible: 0, alreadyPilot: 0, overLimit: 0, sample: [] };

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-LK', {
  day: 'numeric', month: 'short', year: 'numeric'
});

export function CohortRolloutPanel({ maxDevices, onChanged }: { maxDevices: number; onChanged: () => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rollouts, setRollouts] = useState<Rollout[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [limit, setLimit] = useState(10);
  const [cap, setCap] = useState(25);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<Preview>(emptyPreview);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmEnroll, setConfirmEnroll] = useState(false);
  const [pauseChange, setPauseChange] = useState<boolean | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<Rollout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [batchResult, settingsResult, rolloutResult] = await Promise.all([
      supabase.from('batches').select('id,name,program,exam_year').eq('is_active', true).order('exam_year', { ascending: false }).order('name'),
      supabase.from('device_security_settings').select('pilot_paused,cohort_enrollment_cap').eq('id', 1).maybeSingle(),
      supabase.from('device_rollout_cohorts').select('id,batch_id,batch_name,requested_limit,enrolled_count,skipped_over_limit_count,status,created_at,rolled_back_at').order('created_at', { ascending: false }).limit(8)
    ]);

    if (batchResult.error || settingsResult.error || rolloutResult.error) {
      setError('Apply migration_device_limited_rollout.sql to enable controlled cohort rollout.');
    } else {
      setError('');
      setBatches((batchResult.data ?? []) as Batch[]);
      setPaused(settingsResult.data?.pilot_paused === true);
      const nextCap = Number(settingsResult.data?.cohort_enrollment_cap ?? 25);
      setCap(nextCap);
      setLimit((current) => Math.min(current, nextCap));
      setRollouts((rolloutResult.data ?? []) as Rollout[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedBatch) {
      setPreview(emptyPreview);
      return;
    }

    let active = true;
    setPreviewing(true);
    const previewBatch = async () => {
      const { data: memberData, error: memberError } = await supabase
        .from('batch_members')
        .select('student_id,student:profiles!student_id(id,full_name,student_code)')
        .eq('batch_id', selectedBatch);
      if (!active) return;
      if (memberError) {
        setError(memberError.message);
        setPreviewing(false);
        return;
      }

      const members = (memberData ?? []) as unknown as BatchMember[];
      const ids = members.map((member) => member.student_id);
      if (ids.length === 0) {
        setPreview(emptyPreview);
        setPreviewing(false);
        return;
      }

      const [deviceResult, securityResult] = await Promise.all([
        supabase.from('student_devices').select('student_id').in('student_id', ids).eq('lifecycle_status', 'active'),
        supabase.from('student_device_security').select('student_id,pilot_enabled').in('student_id', ids)
      ]);
      if (!active) return;
      if (deviceResult.error || securityResult.error) {
        setError(deviceResult.error?.message || securityResult.error?.message || 'Could not preview this batch.');
        setPreview(emptyPreview);
        setPreviewing(false);
        return;
      }

      const deviceCounts = new Map<string, number>();
      (deviceResult.data ?? []).forEach((row) => deviceCounts.set(row.student_id, (deviceCounts.get(row.student_id) ?? 0) + 1));
      const pilotIds = new Set((securityResult.data ?? []).filter((row) => row.pilot_enabled).map((row) => row.student_id));
      const eligible = members.filter((member) => !pilotIds.has(member.student_id) && (deviceCounts.get(member.student_id) ?? 0) <= maxDevices);
      setPreview({
        total: members.length,
        eligible: eligible.length,
        alreadyPilot: pilotIds.size,
        overLimit: members.filter((member) => !pilotIds.has(member.student_id) && (deviceCounts.get(member.student_id) ?? 0) > maxDevices).length,
        sample: eligible.slice(0, 5).map((member) => ({
          id: member.student_id,
          name: member.student?.full_name || 'Unnamed student',
          code: member.student?.student_code || 'No ID'
        }))
      });
      setPreviewing(false);
    };
    void previewBatch();
    return () => { active = false; };
  }, [maxDevices, selectedBatch]);

  const selectedBatchName = useMemo(
    () => batches.find((batch) => batch.id === selectedBatch)?.name || 'selected batch',
    [batches, selectedBatch]
  );
  const enrollmentCount = Math.min(limit, preview.eligible, cap);

  const enroll = async () => {
    setConfirmEnroll(false);
    setBusy(true);
    setError('');
    const { error: actionError } = await supabase.rpc('admin_enroll_device_cohort', {
      p_batch_id: selectedBatch,
      p_limit: enrollmentCount
    });
    if (actionError) setError(actionError.message);
    else {
      await load();
      onChanged();
      setSelectedBatch('');
      setPreview(emptyPreview);
    }
    setBusy(false);
  };

  const changePause = async () => {
    if (pauseChange === null) return;
    const nextPaused = pauseChange;
    setPauseChange(null);
    setBusy(true);
    setError('');
    const { error: actionError } = await supabase.rpc('admin_set_device_pilot_pause', {
      p_paused: nextPaused,
      p_note: nextPaused ? 'Emergency pause from Device Security workspace' : 'Limited rollout resumed'
    });
    if (actionError) setError(actionError.message);
    else {
      await load();
      onChanged();
    }
    setBusy(false);
  };

  const rollback = async () => {
    if (!rollbackTarget) return;
    const rolloutId = rollbackTarget.id;
    setRollbackTarget(null);
    setBusy(true);
    setError('');
    const { error: actionError } = await supabase.rpc('admin_rollback_device_cohort', {
      p_rollout_id: rolloutId,
      p_note: 'Rolled back from Device Security workspace'
    });
    if (actionError) setError(actionError.message);
    else {
      await load();
      onChanged();
    }
    setBusy(false);
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white py-12 flex justify-center"><Loader2Icon className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }

  if (error && batches.length === 0 && rollouts.length === 0) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{error}</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
      <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <RocketIcon className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">Limited cohort rollout</h2>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">Stage 3</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Add a capped group from one batch, monitor it, and roll it back independently.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPauseChange(!paused)}
          className={`inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 ${paused ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-red-200 bg-white text-red-600 hover:bg-red-50'}`}
        >
          {paused ? <PlayCircleIcon className="w-4 h-4" /> : <PauseCircleIcon className="w-4 h-4" />}
          {paused ? 'Resume enforcement' : 'Emergency pause'}
        </button>
      </div>

      {paused && (
        <div className="px-5 py-3 sm:px-6 bg-amber-50 border-b border-amber-100 flex items-start gap-2.5 text-sm text-amber-800">
          <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <p><strong>Enforcement is paused.</strong> Pilot students can access the LMS while device observations and existing lock records are preserved.</p>
        </div>
      )}

      {error && <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 sm:p-6 lg:border-r border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Create rollout</p>
          <div className="grid sm:grid-cols-[1fr_120px] gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Batch</span>
              <select value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)} className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:ring-2 focus:ring-[#c20f24]/15">
                <option value="">Select a batch</option>
                {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name} · {batch.program || 'Program'} {batch.exam_year || ''}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Maximum students</span>
              <input type="number" min={1} max={cap} value={limit} onChange={(event) => setLimit(Math.min(cap, Math.max(1, Number(event.target.value) || 1)))} className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm tabular-nums focus:ring-2 focus:ring-[#c20f24]/15" />
            </label>
          </div>

          {selectedBatch && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              {previewing ? (
                <div className="h-24 flex items-center justify-center"><Loader2Icon className="w-5 h-5 animate-spin text-slate-300" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ['Batch', preview.total],
                      ['Eligible', preview.eligible],
                      ['Already pilot', preview.alreadyPilot],
                      ['Needs review', preview.overLimit]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="text-xl font-bold tabular-nums text-slate-900 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {preview.sample.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">First eligible students</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.sample.map((student) => <span key={student.id} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-600">{student.name} · {student.code}</span>)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 mt-4 text-xs leading-5 text-slate-500">
            <ShieldCheckIcon className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            Students already above {maxDevices} devices are excluded automatically. The server cap is {cap} students per rollout.
          </div>
          <button
            type="button"
            disabled={busy || paused || !selectedBatch || previewing || enrollmentCount < 1}
            onClick={() => setConfirmEnroll(true)}
            className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UsersIcon className="w-4 h-4" /> Enrol {enrollmentCount || 0} students
          </button>
        </div>

        <div className="p-5 sm:p-6 bg-slate-50/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Recent rollouts</p>
          {rollouts.length === 0 ? (
            <div className="py-10 text-center">
              <LayersIcon className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 mt-2">No cohort rollouts yet</p>
              <p className="text-xs text-slate-500 mt-1">Individual admin pilots remain unchanged.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rollouts.map((rollout) => (
                <div key={rollout.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{rollout.batch_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{rollout.enrolled_count} enrolled · {rollout.skipped_over_limit_count} excluded · {formatDate(rollout.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${rollout.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{rollout.status === 'active' ? 'Active' : 'Rolled back'}</span>
                  </div>
                  {rollout.status === 'active' && (
                    <button type="button" disabled={busy} onClick={() => setRollbackTarget(rollout)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"><RotateCcwIcon className="w-3.5 h-3.5" /> Roll back cohort</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmEnroll}
        title="Start limited rollout?"
        message={`Enrol up to ${enrollmentCount} eligible students from ${selectedBatchName}. Their next device above the ${maxDevices}-device limit can lock LMS access.`}
        confirmLabel={`Enrol ${enrollmentCount}`}
        onConfirm={() => void enroll()}
        onCancel={() => setConfirmEnroll(false)}
      />
      <ConfirmDialog
        open={pauseChange !== null}
        title={pauseChange ? 'Pause all enforcement?' : 'Resume device enforcement?'}
        message={pauseChange
          ? 'All pilot and cohort students will regain LMS access immediately. Device and lock records will be preserved.'
          : 'Existing lock states become effective again immediately. Review locked accounts before resuming.'}
        confirmLabel={pauseChange ? 'Pause enforcement' : 'Resume enforcement'}
        onConfirm={() => void changePause()}
        onCancel={() => setPauseChange(null)}
      />
      <ConfirmDialog
        open={Boolean(rollbackTarget)}
        title="Roll back this cohort?"
        message={`Disable device enforcement for the ${rollbackTarget?.enrolled_count ?? 0} students enrolled through ${rollbackTarget?.batch_name || 'this rollout'}? Individual pilots are not affected.`}
        confirmLabel="Roll back cohort"
        onConfirm={() => void rollback()}
        onCancel={() => setRollbackTarget(null)}
      />
    </section>
  );
}
