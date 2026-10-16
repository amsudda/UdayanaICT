import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  LaptopIcon,
  Loader2Icon,
  MonitorIcon,
  RefreshCwIcon,
  SendIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { getCurrentInstallationToken } from '../security/deviceAudit';

type StudentDevice = {
  id: string;
  display_name: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  model: string | null;
  first_seen: string;
  last_seen: string;
  login_count: number;
  would_exceed_limit: boolean;
  is_current: boolean;
  lifecycle_status: 'active' | 'stale' | 'retired' | 'revoked';
  state_changed_at: string | null;
  state_change_reason: string | null;
};

type ReplacementRequest = {
  id: string;
  reason: string;
  status: 'pending' | 'contacted';
  request_type: 'unlock' | 'replacement';
  target_device_id: string | null;
  target_device_label: string | null;
  created_at: string;
};

const deviceIcons = {
  desktop: MonitorIcon,
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
  unknown: LaptopIcon
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const relativeTime = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : formatDateTime(value);
};

export function MyDevicesPage() {
  const { user, deviceAccess, refreshDeviceAccess } = useAuth();
  const [devices, setDevices] = useState<StudentDevice[]>([]);
  const [request, setRequest] = useState<ReplacementRequest | null>(null);
  const [staleAfterDays, setStaleAfterDays] = useState(90);
  const [selected, setSelected] = useState<StudentDevice | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!user || user.role !== 'student') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const [devicesResult, requestResult, settingsResult] = await Promise.all([
      supabase.rpc('get_my_devices', { p_installation_token: getCurrentInstallationToken() }),
      supabase
        .from('device_access_requests')
        .select('id,reason,status,request_type,target_device_id,target_device_label,created_at')
        .eq('student_id', user.id)
        .in('status', ['pending', 'contacted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('device_security_settings').select('stale_after_days').eq('id', 1).maybeSingle()
    ]);

    if (devicesResult.error) {
      setError('Your device details are temporarily unavailable. Please try again later.');
    } else {
      setDevices((devicesResult.data ?? []) as StudentDevice[]);
      setRequest((requestResult.data as ReplacementRequest | null) ?? null);
      setStaleAfterDays(Number(settingsResult.data?.stale_after_days ?? 90));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    const channel = supabase
      .channel(`my-devices-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_devices', filter: `student_id=eq.${user.id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_access_requests', filter: `student_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, user]);

  const maxDevices = deviceAccess?.maxDevices ?? 2;
  const activeDevices = useMemo(() => devices.filter((device) => device.lifecycle_status === 'active'), [devices]);
  const historyDevices = useMemo(() => devices.filter((device) => device.lifecycle_status !== 'active'), [devices]);
  const withinLimit = activeDevices.length <= maxDevices;
  const replacementRequest = request?.request_type === 'replacement' ? request : null;
  const currentDevice = useMemo(() => devices.find((device) => device.is_current), [devices]);

  const submitReplacement = async () => {
    if (!selected) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setActionError('Please explain the replacement in at least 10 characters.');
      return;
    }
    setBusy(true);
    setActionError('');
    setSuccess('');
    const { error: requestError } = await supabase.rpc('request_device_replacement', {
      p_device_id: selected.id,
      p_installation_token: getCurrentInstallationToken(),
      p_reason: cleanReason
    });
    if (requestError) setActionError(requestError.message);
    else {
      setSuccess('Your replacement request was sent to the administrator.');
      setSelected(null);
      setReason('');
      await Promise.all([load(), refreshDeviceAccess()]);
    }
    setBusy(false);
  };

  const cancelReplacement = async () => {
    if (!replacementRequest) return;
    setBusy(true);
    setActionError('');
    const { error: cancelError } = await supabase.rpc('cancel_my_device_replacement', {
      p_request_id: replacementRequest.id
    });
    if (cancelError) setActionError(cancelError.message);
    else {
      setSuccess('The replacement request was cancelled.');
      await Promise.all([load(), refreshDeviceAccess()]);
    }
    setBusy(false);
  };

  if (user && user.role !== 'student') {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <ShieldCheckIcon className="mx-auto h-10 w-10 text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Student devices only</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Administrators can review device security from the admin workspace.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c20f24]">Account security</p>
        <h1 className="mt-2 text-3xl font-bold text-apple-text dark:text-apple-light">My devices</h1>
        <p className="mt-2 max-w-2xl text-sm text-apple-subtext dark:text-slate-400">
          Review the browser installations recognised for your LMS account and request help replacing an old device.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-3xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Loader2Icon className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3"><AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${withinLimit ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'}`}>
                  {withinLimit ? <ShieldCheckIcon className="h-6 w-6" /> : <AlertCircleIcon className="h-6 w-6" />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{withinLimit ? 'Your account is within the device limit' : 'Your account needs review'}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${deviceAccess?.pilotEnabled ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                      {deviceAccess?.pilotEnabled ? deviceAccess.pilotPaused ? 'Enforcement paused' : 'Device limit active' : 'Audit only'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {activeDevices.length} of {maxDevices} active browser installations. {historyDevices.length} older record{historyDevices.length === 1 ? '' : 's'} remain in security history.
                  </p>
                  {currentDevice && <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Current browser: {currentDevice.display_name || 'Recognised device'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 lg:justify-end">
                <div className="text-right">
                  <p className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">{activeDevices.length}<span className="text-base font-semibold text-slate-300">/{maxDevices}</span></p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Device slots</p>
                </div>
                <button type="button" onClick={() => void load()} aria-label="Refresh devices" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20 dark:border-slate-700 dark:hover:bg-slate-800">
                  <RefreshCwIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
              <div className={`h-full transition-[width] duration-500 ${withinLimit ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (activeDevices.length / Math.max(1, maxDevices)) * 100)}%` }} />
            </div>
          </section>

          {(actionError || success) && (
            <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${actionError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
              {actionError || success}
            </div>
          )}

          {replacementRequest && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/25 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <Clock3Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white">Replacement request {replacementRequest.status === 'contacted' ? 'is being reviewed' : 'sent'}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Requested for {replacementRequest.target_device_label || 'an old device'} on {formatDateTime(replacementRequest.created_at)}.</p>
                    <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">“{replacementRequest.reason}”</p>
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => void cancelReplacement()} className="h-9 shrink-0 rounded-xl border border-amber-300 bg-white px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-transparent dark:text-amber-200">
                  Cancel request
                </button>
              </div>
            </section>
          )}

          {request && !replacementRequest && (
            <section className="rounded-3xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/25 sm:p-6">
              <div className="flex items-start gap-3">
                <Clock3Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">Your account access request is being reviewed</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Submitted {formatDateTime(request.created_at)}. Device replacement requests will be available after the administrator completes this review.</p>
                </div>
              </div>
            </section>
          )}

          {selected && (
            <section aria-labelledby="replacement-title" className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-900/60 dark:bg-violet-950/25 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="replacement-title" className="font-bold text-slate-900 dark:text-white">Request replacement for {selected.display_name || 'this device'}</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tell the administrator why this installation should be removed. Your request does not remove it automatically.</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setReason(''); setActionError(''); }} aria-label="Close replacement form" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 dark:hover:bg-slate-800 dark:hover:text-white"><XIcon className="h-4 w-4" /></button>
              </div>
              <label htmlFor="replacement-reason" className="mt-5 block text-xs font-bold text-slate-700 dark:text-slate-200">Reason for replacement</label>
              <textarea id="replacement-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 1000))} rows={3} placeholder="For example: I sold this phone and no longer use it…" className="mt-2 w-full resize-none rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-200 dark:border-violet-900 dark:bg-slate-900 dark:text-white" />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">{reason.trim().length}/1000 · Minimum 10 characters</p>
                <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void submitReplacement()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900">
                  {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />} Send request
                </button>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recognised installations</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only administrators can remove a record after checking your request.</p>
              </div>
            </div>

            {devices.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <LaptopIcon className="mx-auto h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="mt-3 font-semibold text-slate-900 dark:text-white">No recognised devices yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This browser will appear after its next security refresh.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {devices.map((device, index) => {
                  const Icon = deviceIcons[device.device_type] ?? LaptopIcon;
                  const canRequest = deviceAccess?.pilotEnabled && device.lifecycle_status === 'active' && !device.is_current && !request;
                  const isRequested = replacementRequest?.target_device_id === device.id;
                  const stateStyles = {
                    active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                    stale: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                    retired: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
                    revoked: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                  };
                  return (
                    <article key={device.id} className={`rounded-3xl border bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.035)] dark:bg-slate-900 ${device.is_current ? 'border-emerald-200 dark:border-emerald-900/70' : isRequested ? 'border-amber-200 dark:border-amber-900/70' : 'border-gray-100 dark:border-slate-800'}`}>
                      <div className="flex items-start gap-4">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${device.is_current ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><Icon className="h-6 w-6" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-900 dark:text-white">{device.display_name || 'Unknown device'}</h3>
                              <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">{device.device_type} · Device {index + 1}</p>
                            </div>
                            {device.is_current ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2Icon className="h-3 w-3" /> Current</span> : isRequested ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Requested</span> : null}
                            {!device.is_current && !isRequested && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${stateStyles[device.lifecycle_status]}`}>{device.lifecycle_status}</span>}
                          </div>
                          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Browser</dt><dd className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{device.browser_name || 'Unknown'} {device.browser_version?.split('.')[0] || ''}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System</dt><dd className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{device.os_name || 'Unknown'} {device.os_version || ''}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First seen</dt><dd className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{formatDateTime(device.first_seen)}</dd></div>
                            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Activity</dt><dd className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{relativeTime(device.last_seen)}</dd></div>
                          </dl>
                          {!device.is_current && device.lifecycle_status === 'active' && deviceAccess?.pilotEnabled && (
                            <button type="button" disabled={!canRequest || busy} onClick={() => { setSelected(device); setReason(''); setActionError(''); setSuccess(''); }} className="mt-4 text-xs font-bold text-[#c20f24] hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline dark:disabled:text-slate-600">
                              {request ? 'A request is already open' : 'Request device replacement'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200">
            <strong>Device lifecycle:</strong> A browser becomes stale after {staleAfterDays} inactive days and stops using a device slot. Retired and revoked records remain visible for security history. The LMS does not access your photos, files, contacts or precise location.
          </aside>
        </>
      )}
    </div>
  );
}
