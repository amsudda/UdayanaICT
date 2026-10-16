import { useEffect, useState } from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LaptopIcon,
  LockKeyholeIcon,
  LogOutIcon,
  SendIcon,
  ShieldAlertIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function DeviceLockedPage() {
  const { user, deviceAccess, requestDeviceAccess, logout } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(deviceAccess?.hasOpenRequest === true);

  useEffect(() => {
    setSent(deviceAccess?.hasOpenRequest === true);
  }, [deviceAccess?.hasOpenRequest]);

  const submit = async () => {
    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Please explain the situation in at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await requestDeviceAccess(cleanReason);
    setSubmitting(false);
    if (!result.success) {
      setError(result.message || 'Could not send your request. Please try again.');
      return;
    }
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-[#FAF9F8] text-slate-900 px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <img src="/images/pd-logo.png" alt="Pasindu Dissanayake ICT" className="w-8 h-8 object-contain" />
            </span>
            <div>
              <p className="font-bold text-slate-900 leading-tight">Pasindu Dissanayake ICT</p>
              <p className="text-xs text-slate-500">Account security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <LogOutIcon className="w-4 h-4" /> <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="px-6 py-8 sm:px-10 sm:py-10 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#c20f24] flex items-center justify-center mb-6">
              <LockKeyholeIcon className="w-7 h-7" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c20f24]">Temporary security lock</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">Your LMS access is temporarily paused</h1>
            <p className="text-sm sm:text-base leading-7 text-slate-600 mt-4 max-w-2xl">
              We observed more active browser installations than the two-device limit, or a revoked device attempted access. Your learning data and purchases are safe. Send the administrator a short explanation so they can review the devices and restore access.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 border-b border-slate-100">
            <div className="px-6 py-5 sm:px-8 border-b sm:border-b-0 sm:border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student</p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">{user?.name || 'Student'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.studentId || user?.email}</p>
            </div>
            <div className="px-6 py-5 sm:px-8 border-b sm:border-b-0 sm:border-r border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{deviceAccess?.totalDevices ?? '—'} devices</p>
              <p className="text-xs text-slate-500 mt-0.5">Limit: {deviceAccess?.maxDevices ?? 2}</p>
            </div>
            <div className="px-6 py-5 sm:px-8">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <p className="text-sm font-bold text-[#c20f24] mt-1">Admin review required</p>
              <p className="text-xs text-slate-500 mt-0.5">Temporary, not a ban</p>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-9">
            {sent || deviceAccess?.hasOpenRequest ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex items-start gap-4">
                <CheckCircle2Icon className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="font-bold text-slate-900">Your request has been sent</h2>
                  <p className="text-sm leading-6 text-slate-600 mt-1">The administrator can now review your devices and contact you using the details on your student profile. This page will unlock automatically after approval.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <ShieldAlertIcon className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-900">Request access from the administrator</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Tell us why another device or browser was used.</p>
                  </div>
                </div>
                <label htmlFor="device-access-reason" className="text-xs font-bold text-slate-700">Reason for the additional device</label>
                <textarea
                  id="device-access-reason"
                  value={reason}
                  onChange={(event) => { setReason(event.target.value.slice(0, 1000)); setError(''); }}
                  rows={5}
                  placeholder="For example: My phone was repaired, so I temporarily logged in from a family computer..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#c20f24]/15 focus:border-[#c20f24]/40 resize-none"
                />
                <div className="flex items-start justify-between gap-4 mt-2">
                  <div>
                    {error && <p className="text-xs font-medium text-red-600 flex items-center gap-1.5"><AlertCircleIcon className="w-3.5 h-3.5" />{error}</p>}
                  </div>
                  <span className="text-xs tabular-nums text-slate-400">{reason.length}/1000</span>
                </div>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || reason.trim().length < 10}
                  className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#c20f24] text-white text-sm font-bold hover:bg-[#a60d1f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-4 h-4" /> {submitting ? 'Sending request…' : 'Request access from admin'}
                </button>
              </>
            )}
          </div>
        </section>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-sm text-slate-600">
          <LaptopIcon className="w-5 h-5 text-slate-400 shrink-0" />
          <p><strong className="text-slate-800">Why can one device appear twice?</strong> Another browser, private browsing, or clearing browser storage can create a separate installation record. The administrator will check this before making a decision.</p>
        </div>
      </div>
    </main>
  );
}
