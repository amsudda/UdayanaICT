import { useCallback, useEffect, useState } from 'react';
import { ArchiveIcon, Clock3Icon, Loader2Icon, RefreshCwIcon, SaveIcon, ShieldXIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type LifecycleStatus = 'active' | 'stale' | 'retired' | 'revoked';

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not run yet';

export function DeviceLifecyclePanel({ onChanged }: { onChanged: () => void }) {
  const [days, setDays] = useState(90);
  const [savedDays, setSavedDays] = useState(90);
  const [lastSweep, setLastSweep] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<LifecycleStatus, number>>({ active: 0, stale: 0, retired: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsResult, devicesResult] = await Promise.all([
      supabase.from('device_security_settings').select('stale_after_days,lifecycle_last_sweep_at').eq('id', 1).maybeSingle(),
      supabase.from('student_devices').select('lifecycle_status')
    ]);
    if (settingsResult.error || devicesResult.error) {
      setError('Apply migration_device_lifecycle.sql to enable device lifecycle controls.');
    } else {
      const nextDays = Number(settingsResult.data?.stale_after_days ?? 90);
      const nextCounts: Record<LifecycleStatus, number> = { active: 0, stale: 0, retired: 0, revoked: 0 };
      (devicesResult.data ?? []).forEach((row) => {
        const status = row.lifecycle_status as LifecycleStatus;
        if (status in nextCounts) nextCounts[status] += 1;
      });
      setDays(nextDays);
      setSavedDays(nextDays);
      setLastSweep(settingsResult.data?.lifecycle_last_sweep_at ?? null);
      setCounts(nextCounts);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    const { data, error: actionError } = await supabase.rpc('admin_update_device_lifecycle', { p_stale_after_days: days });
    if (actionError) setError(actionError.message);
    else {
      setMessage(`Saved. ${Number(data ?? 0)} inactive device record${Number(data ?? 0) === 1 ? '' : 's'} moved to history.`);
      await load();
      onChanged();
    }
    setBusy(false);
  };

  const sweep = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    const { data, error: actionError } = await supabase.rpc('admin_refresh_device_lifecycle');
    if (actionError) setError(actionError.message);
    else {
      setMessage(`${Number(data ?? 0)} inactive device record${Number(data ?? 0) === 1 ? '' : 's'} moved to history.`);
      await load();
      onChanged();
    }
    setBusy(false);
  };

  if (loading) return <div className="mb-6 flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2Icon className="h-5 w-5 animate-spin text-slate-300" /></div>;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ArchiveIcon className="h-5 w-5" /></span>
          <div><h2 className="font-bold text-slate-900">Device lifecycle</h2><p className="mt-0.5 text-sm text-slate-500">Keep active slots accurate without deleting security history.</p></div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{counts.active} active</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{counts.stale} stale</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{counts.retired} retired</span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{counts.revoked} revoked</span>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label htmlFor="stale-device-days" className="text-xs font-bold text-slate-700">Mark inactive devices stale after</label>
          <div className="mt-2 flex max-w-sm items-center gap-2">
            <input id="stale-device-days" type="number" min={30} max={365} value={days} onChange={(event) => setDays(Math.min(365, Math.max(30, Number(event.target.value) || 30)))} className="h-11 w-28 rounded-xl border border-slate-200 px-3 text-sm font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20" />
            <span className="text-sm text-slate-500">days without activity</span>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Stale and retired devices stop consuming a slot. Revoked devices stay blocked. Any stale or retired browser used again re-enters under the normal limit.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <button type="button" disabled={busy} onClick={() => void sweep()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCwIcon className="h-4 w-4" /> Run sweep</button>
          <button type="button" disabled={busy || days === savedDays} onClick={() => void save()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><SaveIcon className="h-4 w-4" /> Save policy</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="inline-flex items-center gap-1.5"><Clock3Icon className="h-3.5 w-3.5" /> Last global sweep: {formatDate(lastSweep)}</span>
        <span className="inline-flex items-center gap-1.5"><ShieldXIcon className="h-3.5 w-3.5" /> Revoked sessions are removed immediately</span>
      </div>
      {(message || error) && <div role="status" className={`border-t px-5 py-3 text-sm sm:px-6 ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}
    </section>
  );
}
