import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangleIcon,
  Clock3Icon,
  LaptopIcon,
  Loader2Icon,
  MailIcon,
  MessageSquareTextIcon,
  MonitorIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TabletIcon,
  TestTube2Icon,
  UnlockIcon,
  ListChecksIcon,
  ArchiveIcon,
  BanIcon,
  RotateCcwIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from './ConfirmDialog';

type StudentDevice = {
  id: string;
  display_name: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  model: string | null;
  language: string | null;
  timezone: string | null;
  first_seen: string;
  last_seen: string;
  login_count: number;
  would_exceed_limit: boolean;
  lifecycle_status: 'active' | 'stale' | 'retired' | 'revoked';
  state_changed_at: string | null;
  state_change_reason: string | null;
};

type DeviceSecurity = {
  pilot_enabled: boolean;
  status: 'active' | 'locked';
  locked_at: string | null;
  lock_reason: string | null;
  lock_device_id: string | null;
};

type AccessRequest = {
  id: string;
  reason: string;
  status: 'pending' | 'contacted';
  request_type?: 'unlock' | 'replacement';
  target_device_id?: string | null;
  target_device_label?: string | null;
  created_at: string;
};

type SecurityEvent = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const deviceIcon = {
  desktop: MonitorIcon,
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
  unknown: LaptopIcon
};

export function StudentDevicesPanel({
  studentId,
  studentPhone,
  studentEmail
}: {
  studentId: string;
  studentPhone?: string | null;
  studentEmail?: string | null;
}) {
  const [devices, setDevices] = useState<StudentDevice[]>([]);
  const [maxDevices, setMaxDevices] = useState(2);
  const [staleAfterDays, setStaleAfterDays] = useState(90);
  const [pilotPaused, setPilotPaused] = useState(false);
  const [security, setSecurity] = useState<DeviceSecurity | null>(null);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [stateTarget, setStateTarget] = useState<{ device: StudentDevice; state: 'active' | 'retired' | 'revoked' } | null>(null);
  const [pilotChange, setPilotChange] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [{ data, error: devicesError }, { data: settings }, { data: securityData }, { data: requestData }, { data: eventData }] = await Promise.all([
      supabase
        .from('student_devices')
        .select('id,display_name,device_type,browser_name,browser_version,os_name,os_version,model,language,timezone,first_seen,last_seen,login_count,would_exceed_limit,lifecycle_status,state_changed_at,state_change_reason')
        .eq('student_id', studentId)
        .order('last_seen', { ascending: false }),
      supabase.from('device_security_settings').select('max_devices,pilot_paused,stale_after_days').eq('id', 1).maybeSingle(),
      supabase.from('student_device_security').select('pilot_enabled,status,locked_at,lock_reason,lock_device_id').eq('student_id', studentId).maybeSingle(),
      supabase
        .from('device_access_requests')
        .select('id,reason,status,request_type,target_device_id,target_device_label,created_at')
        .eq('student_id', studentId)
        .in('status', ['pending', 'contacted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('device_security_events')
        .select('id,action,details,created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (devicesError) {
      setError('Device audit data is unavailable. Apply the device audit database migration, then refresh.');
    } else {
      setDevices((data ?? []) as StudentDevice[]);
      if (settings?.max_devices) setMaxDevices(settings.max_devices);
      setStaleAfterDays(Number(settings?.stale_after_days ?? 90));
      setPilotPaused(settings?.pilot_paused === true);
      setSecurity((securityData as DeviceSecurity | null) ?? null);
      setRequest((requestData as AccessRequest | null) ?? null);
      setEvents((eventData ?? []) as SecurityEvent[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(true);
    setActionError('');
    const { error: actionFailure } = await action();
    if (actionFailure) setActionError(actionFailure.message);
    else await load();
    setBusy(false);
  };

  const setPilot = (enabled: boolean) => runAction(() =>
    supabase.rpc('admin_set_device_pilot', { p_student_id: studentId, p_enabled: enabled })
  );

  const changeDeviceState = () => {
    if (!stateTarget) return;
    const { device, state } = stateTarget;
    setStateTarget(null);
    void runAction(() => supabase.rpc('admin_set_student_device_state', {
      p_device_id: device.id,
      p_state: state,
      p_reason: adminNote.trim() || `Changed to ${state} from the student device workspace`
    }));
  };

  const restoreAccess = () => runAction(() =>
    supabase.rpc('admin_restore_device_access', {
      p_student_id: studentId,
      p_admin_note: adminNote.trim() || null
    })
  );

  const approveReplacement = () => {
    if (!request) return;
    void runAction(() => supabase.rpc('admin_approve_device_replacement', {
      p_request_id: request.id,
      p_admin_note: adminNote.trim() || null
    }));
  };

  const reviewRequest = (decision: 'contacted' | 'rejected') => {
    if (!request) return;
    void runAction(() => supabase.rpc('admin_review_device_request', {
      p_request_id: request.id,
      p_decision: decision,
      p_admin_note: adminNote.trim() || null
    }));
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2Icon className="w-7 h-7 text-slate-300 animate-spin" /></div>;
  }

  const activeDevices = devices.filter((device) => device.lifecycle_status === 'active');
  const archivedDevices = devices.length - activeDevices.length;
  const overLimit = activeDevices.length > maxDevices || activeDevices.some((device) => device.would_exceed_limit);
  const pilotEnabled = security?.pilot_enabled === true;
  const isLocked = pilotEnabled && security?.status === 'locked';
  const isReplacementRequest = request?.request_type === 'replacement';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Device audit</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${pilotEnabled ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
              {pilotEnabled ? <TestTube2Icon className="w-3.5 h-3.5" /> : <ShieldCheckIcon className="w-3.5 h-3.5" />}
              {pilotEnabled ? pilotPaused ? 'Pilot paused' : 'Admin pilot' : 'Audit only'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {pilotEnabled ? 'The two-device access rule is active for this student.' : 'Observed browser installations. No access restrictions are active.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCwIcon className="w-4 h-4" /> Refresh
          </button>
          <button
            type="button"
            disabled={busy || (!pilotEnabled && activeDevices.length > maxDevices)}
            onClick={() => setPilotChange(!pilotEnabled)}
            className={`inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${pilotEnabled ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            <TestTube2Icon className="w-4 h-4" /> {busy ? 'Saving…' : pilotEnabled ? 'End pilot' : 'Start pilot'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
      )}

      {pilotEnabled && pilotPaused && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
          Global device enforcement is paused. This student can access the LMS while their pilot and lock records remain preserved.
        </div>
      )}

      {!error && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
          Only active devices use a slot. Inactive devices become stale after {staleAfterDays} days; retired and revoked records remain in the audit history.
        </div>
      )}

      {!error && (
        <>
          {isLocked && (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangleIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{pilotPaused ? 'Lock record preserved while enforcement is paused' : 'Student access is temporarily locked'}</p>
                    <p className="text-sm text-slate-600 mt-1">{pilotPaused ? 'The student currently has LMS access. Resolve the devices before global enforcement resumes.' : security?.lock_reason || 'The device limit was exceeded.'}</p>
                    {security?.locked_at && <p className="text-xs text-slate-500 mt-1.5">Locked {formatDateTime(security.locked_at)}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || activeDevices.length > maxDevices || isReplacementRequest}
                  onClick={() => void restoreAccess()}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#c20f24] text-white text-sm font-bold hover:bg-[#a60d1f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UnlockIcon className="w-4 h-4" /> Restore access
                </button>
              </div>
              {activeDevices.length > maxDevices && <p className="text-xs font-semibold text-red-700 mt-4">Retire {activeDevices.length - maxDevices} active device{activeDevices.length - maxDevices === 1 ? '' : 's'} before restoring access.</p>}
            </div>
          )}

          {request && (
            <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
              <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MessageSquareTextIcon className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{isReplacementRequest ? 'Device replacement request' : 'Student access request'}</p>
                    <p className="text-xs text-slate-500">Submitted {formatDateTime(request.created_at)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">{request.status}</span>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student's reason</p>
                <p className="text-sm leading-6 text-slate-700 mt-2 whitespace-pre-wrap">{request.reason}</p>
                {isReplacementRequest && (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-3 text-sm text-violet-800">
                    Requested device: <strong>{request.target_device_label || 'Unknown device'}</strong>. Approval will atomically retire the device, end its registered sessions, and preserve the record in history.
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  {studentPhone && <a href={`tel:${studentPhone}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"><PhoneIcon className="w-3.5 h-3.5" /> Call student</a>}
                  {studentEmail && <a href={`mailto:${studentEmail}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"><MailIcon className="w-3.5 h-3.5" /> Email student</a>}
                  {request.status === 'pending' && <button type="button" disabled={busy} onClick={() => reviewRequest('contacted')} className="inline-flex items-center h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Mark contacted</button>}
                </div>
                <label htmlFor="device-admin-note" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-5">Private admin note</label>
                <textarea id="device-admin-note" value={adminNote} onChange={(event) => setAdminNote(event.target.value.slice(0, 1000))} rows={2} placeholder="Optional review note…" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#c20f24]/15 focus:border-[#c20f24]/40 resize-none" />
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
                  <button type="button" disabled={busy} onClick={() => reviewRequest('rejected')} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Reject request</button>
                  <button type="button" disabled={busy || (!isReplacementRequest && activeDevices.length > maxDevices)} onClick={() => isReplacementRequest ? approveReplacement() : void restoreAccess()} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#c20f24] text-white text-sm font-bold hover:bg-[#a60d1f] disabled:opacity-50 disabled:cursor-not-allowed"><UnlockIcon className="w-4 h-4" /> {isReplacementRequest ? 'Retire device & approve' : 'Approve & restore'}</button>
                </div>
              </div>
            </div>
          )}

          {!pilotEnabled && activeDevices.length > maxDevices && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
              Retire old or duplicate active devices until this student is within the {maxDevices}-device limit before starting the pilot.
            </div>
          )}

          <div className={`rounded-2xl border p-5 ${overLimit ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${overLimit ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {overLimit ? <AlertTriangleIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    {overLimit ? 'Would exceed the device limit' : 'Within the planned device limit'}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {activeDevices.length} active of {maxDevices} allowed · {archivedDevices} in history
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 sm:text-right">
                <span className="text-3xl font-bold tabular-nums text-slate-900">{activeDevices.length}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">active</span>
              </div>
            </div>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
              <MonitorIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-900">No devices observed yet</p>
              <p className="text-sm text-slate-500 mt-1">This will populate after the student's next login or active session refresh.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {devices.map((device, index) => {
                const Icon = deviceIcon[device.device_type] ?? LaptopIcon;
                const stateStyles = {
                  active: 'bg-emerald-50 text-emerald-700',
                  stale: 'bg-slate-100 text-slate-600',
                  retired: 'bg-blue-50 text-blue-700',
                  revoked: 'bg-red-50 text-red-700'
                };
                return (
                  <article key={device.id} className={`rounded-2xl border bg-white p-5 ${device.would_exceed_limit ? 'border-red-200' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-4">
                      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${device.would_exceed_limit ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-6 h-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">{device.display_name || 'Unknown device'}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 capitalize">{device.device_type} · Device {index + 1}</p>
                          </div>
                          {device.would_exceed_limit && (
                            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Over limit</span>
                          )}
                          {request?.target_device_id === device.id && (
                            <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">Replacement requested</span>
                          )}
                          {security?.lock_device_id === device.id && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Triggered lock</span>
                          )}
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${stateStyles[device.lifecycle_status]}`}>{device.lifecycle_status}</span>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-5 pt-4 border-t border-slate-100">
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Browser</dt>
                            <dd className="text-sm font-medium text-slate-700 mt-0.5 truncate">{device.browser_name || 'Unknown'} {device.browser_version ? device.browser_version.split('.')[0] : ''}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System</dt>
                            <dd className="text-sm font-medium text-slate-700 mt-0.5 truncate">{device.os_name || 'Unknown'} {device.os_version || ''}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First seen</dt>
                            <dd className="text-xs text-slate-600 mt-0.5">{formatDateTime(device.first_seen)}</dd>
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sessions</dt>
                            <dd className="text-sm font-bold tabular-nums text-slate-700 mt-0.5">{device.login_count}</dd>
                          </div>
                        </dl>

                        <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-500">
                          <Clock3Icon className="w-3.5 h-3.5" /> Last seen {formatDateTime(device.last_seen)}
                        </div>
                        {device.state_change_reason && device.lifecycle_status !== 'active' && <p className="mt-2 text-xs text-slate-400">{device.state_change_reason}</p>}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                          {device.lifecycle_status === 'active' ? (
                            <>
                              <button type="button" disabled={busy} onClick={() => setStateTarget({ device, state: 'retired' })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ArchiveIcon className="h-3.5 w-3.5" /> Retire</button>
                              <button type="button" disabled={busy || !pilotEnabled} title={pilotEnabled ? 'Block this browser installation' : 'Enable device enforcement before revoking a device'} onClick={() => setStateTarget({ device, state: 'revoked' })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><BanIcon className="h-3.5 w-3.5" /> Revoke</button>
                            </>
                          ) : (
                            <button type="button" disabled={busy || (pilotEnabled && activeDevices.length >= maxDevices)} onClick={() => setStateTarget({ device, state: 'active' })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><RotateCcwIcon className="h-3.5 w-3.5" /> Restore active slot</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {events.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
                <ListChecksIcon className="w-5 h-5 text-slate-500" />
                <div><h3 className="text-sm font-bold text-slate-900">Security activity</h3><p className="text-xs text-slate-500 mt-0.5">Latest pilot, request and review events</p></div>
              </div>
              <div className="divide-y divide-slate-100">
                {events.map((event) => {
                  const labels: Record<string, string> = {
                    pilot_enabled: 'Device pilot enabled',
                    pilot_disabled: 'Device pilot disabled',
                    cohort_enrolled: 'Added through cohort rollout',
                    cohort_rolled_back: 'Cohort rollout reversed',
                    account_locked: 'Account automatically locked',
                    access_requested: 'Student requested account access',
                    replacement_requested: 'Student requested a device replacement',
                    replacement_cancelled: 'Student cancelled the replacement request',
                    replacement_approved: 'Device replacement approved',
                    device_removed: 'Administrator removed a device',
                    device_active: 'Device restored to an active slot',
                    device_retired: 'Device retired to history',
                    device_revoked: 'Device permanently revoked',
                    device_reactivated: 'Inactive device used again',
                    devices_marked_stale: 'Inactive devices moved to history',
                    lifecycle_auto_restored: 'Access restored by lifecycle policy',
                    access_restored: 'Administrator restored access',
                    request_contacted: 'Student contact recorded',
                    request_rejected: 'Request rejected',
                    rollout_paused: 'Global enforcement paused',
                    rollout_resumed: 'Global enforcement resumed'
                  };
                  return (
                    <div key={event.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{labels[event.action] || event.action.replaceAll('_', ' ')}</p><p className="text-xs text-slate-400 mt-0.5">{formatDateTime(event.created_at)}</p></div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(stateTarget)}
        title={stateTarget?.state === 'revoked' ? 'Permanently revoke this device?' : stateTarget?.state === 'retired' ? 'Retire this active device?' : 'Restore this device?' }
        message={stateTarget?.state === 'revoked'
          ? `${stateTarget.device.display_name || 'This browser installation'} will be blocked from LMS content and preserved in security history. A future login from it will lock a pilot account for review.`
          : stateTarget?.state === 'retired'
            ? `${stateTarget.device.display_name || 'This browser installation'} will stop using a device slot and move to history. If used again, it can re-enter under the normal device limit.`
            : `${stateTarget?.device.display_name || 'This browser installation'} will use one active device slot again.`}
        confirmLabel={stateTarget?.state === 'revoked' ? 'Revoke device' : stateTarget?.state === 'retired' ? 'Retire device' : 'Restore device'}
        onConfirm={changeDeviceState}
        onCancel={() => setStateTarget(null)}
      />
      <ConfirmDialog
        open={pilotChange !== null}
        title={pilotChange ? 'Start device pilot?' : 'End device pilot?'}
        message={pilotChange
          ? `This student will be limited to ${maxDevices} browser installations. A new device above the limit will temporarily lock their LMS access.`
          : 'This removes device enforcement for the student and immediately restores access. Their audit history will be kept.'}
        confirmLabel={pilotChange ? 'Start pilot' : 'End pilot'}
        onConfirm={() => {
          const enabled = pilotChange;
          setPilotChange(null);
          if (enabled !== null) void setPilot(enabled);
        }}
        onCancel={() => setPilotChange(null)}
      />
    </div>
  );
}
