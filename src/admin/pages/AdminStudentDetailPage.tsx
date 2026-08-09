import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CalendarIcon,
  CheckIcon,
  FilmIcon,
  GiftIcon,
  IdCardIcon,
  LayersIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlayCircleIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserIcon,
  VideoIcon,
  XCircleIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { formatLKR } from '../../data/paymentConfig';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700'
};

const initials = (n?: string) =>
  (n ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

type Enr = { id: string; source_payment_id: string | null };
type AccessState = 'paid' | 'granted' | 'none';

/* ── little iOS-style switch ── */
function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-40 ${
        on ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

/* ── card shell with an icon header ── */
function Card({
  icon: Icon,
  title,
  desc,
  accent = 'text-blue-600 bg-blue-50',
  children,
  action
}: {
  icon: any;
  title: string;
  desc?: string;
  accent?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 leading-tight">{title}</h2>
          {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { user: admin } = useAuth();

  const [student, setStudent] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchIds, setBatchIds] = useState<Set<string>>(new Set());
  const [packs, setPacks] = useState<any[]>([]);
  const [months, setMonths] = useState<any[]>([]);
  const [packEnr, setPackEnr] = useState<Record<string, Enr>>({});
  const [monthEnr, setMonthEnr] = useState<Record<string, Enr>>({});
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // ID verification
  const [idUrls, setIdUrls] = useState<{ front?: string; back?: string }>({});
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [vBusy, setVBusy] = useState(false);

  // delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const setBusyKey = (k: string, v: boolean) =>
    setBusy((p) => {
      const n = new Set(p);
      v ? n.add(k) : n.delete(k);
      return n;
    });

  const loadEnrollments = useCallback(async () => {
    const { data: enr } = await supabase
      .from('enrollments')
      .select('id, pack_id, theory_month_id, source_payment_id')
      .eq('student_id', id);
    const pe: Record<string, Enr> = {};
    const me: Record<string, Enr> = {};
    (enr ?? []).forEach((e: any) => {
      if (e.pack_id) pe[e.pack_id] = { id: e.id, source_payment_id: e.source_payment_id };
      if (e.theory_month_id) me[e.theory_month_id] = { id: e.id, source_payment_id: e.source_payment_id };
    });
    setPackEnr(pe);
    setMonthEnr(me);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: s }, { data: bs }, { data: ps }, { data: ms }, { data: pays }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, batch_members(batch:batches(id,name,program,exam_year))')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase
        .from('packs')
        .select('id,title,type,thumbnail_url,price,is_free')
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('theory_months')
        .select('id,month,year,thumbnail_url,session_count,price')
        .eq('is_published', true)
        .order('year', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('student_id', id).order('created_at', { ascending: false })
    ]);

    if (!s) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setStudent(s);
    setBatchIds(new Set((s.batch_members ?? []).map((m: any) => m.batch?.id).filter(Boolean)));
    setBatches(bs ?? []);
    setPacks(ps ?? []);
    setMonths(ms ?? []);
    setPayments(pays ?? []);
    setPaidMonths(
      new Set(
        (pays ?? [])
          .filter((p: any) => p.kind === 'monthly_fee' && p.status === 'approved')
          .map((p: any) => `${p.period_month}-${p.period_year}`)
      )
    );
    await loadEnrollments();

    // signed URLs for the uploaded ID photos (private bucket)
    if (s.id_front_path || s.id_back_path) {
      const [f, b] = await Promise.all([
        s.id_front_path
          ? supabase.storage.from('id-cards').createSignedUrl(s.id_front_path, 3600)
          : Promise.resolve({ data: null }),
        s.id_back_path
          ? supabase.storage.from('id-cards').createSignedUrl(s.id_back_path, 3600)
          : Promise.resolve({ data: null })
      ]);
      setIdUrls({ front: (f.data as any)?.signedUrl, back: (b.data as any)?.signedUrl });
    } else {
      setIdUrls({});
    }

    setLoading(false);
  }, [id, loadEnrollments]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── batch membership (assign = verify) ── */
  const toggleBatch = async (batchId: string) => {
    const key = `b:${batchId}`;
    setBusyKey(key, true);
    if (batchIds.has(batchId)) {
      await supabase.from('batch_members').delete().eq('batch_id', batchId).eq('student_id', id);
      setBatchIds((p) => {
        const n = new Set(p);
        n.delete(batchId);
        return n;
      });
    } else {
      await supabase.from('batch_members').insert({ batch_id: batchId, student_id: id });
      setBatchIds((p) => new Set([...p, batchId]));
    }
    setBusyKey(key, false);
  };

  /* ── ID verification review ── */
  const decideVerification = async (status: 'approved' | 'rejected') => {
    setVBusy(true);
    await supabase
      .from('profiles')
      .update({
        verification_status: status,
        verification_reviewed_by: admin?.id ?? null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reject_reason: status === 'rejected' ? rejectReason.trim() || 'Please re-upload a clearer ID.' : null
      })
      .eq('id', id);
    setVBusy(false);
    setShowReject(false);
    setRejectReason('');
    load();
  };

  /* ── delete the whole student account ── */
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    // Delete storage files first
    await supabase.storage.from('id-cards').list(id).then(async ({ data }) => {
      if (data?.length) {
        await supabase.storage.from('id-cards').remove(data.map((f: any) => `${id}/${f.name}`));
      }
    });
    // Delete from profiles — Supabase's own cascade trigger removes the auth user too
    const { error } = await supabase.from('profiles').delete().eq('id', id).eq('role', 'student');
    setDeleting(false);
    if (error) {
      setConfirmDelete(false);
      setDeleteError(error.message || 'Could not delete this student.');
      return;
    }
    navigate('/admin/students');
  };

  /* ── access grants (comp a student) ── */
  const grant = async (key: string, row: { pack_id?: string; theory_month_id?: string }) => {
    setBusyKey(key, true);
    await supabase.from('enrollments').insert({ student_id: id, ...row });
    await loadEnrollments();
    setBusyKey(key, false);
  };
  const revoke = async (key: string, enrId: string) => {
    setBusyKey(key, true);
    await supabase.from('enrollments').delete().eq('id', enrId);
    await loadEnrollments();
    setBusyKey(key, false);
  };

  const packState = (packId: string): AccessState => {
    const e = packEnr[packId];
    if (!e) return 'none';
    return e.source_payment_id ? 'paid' : 'granted';
  };
  const monthState = (m: any): AccessState => {
    if (paidMonths.has(`${m.month}-${m.year}`)) return 'paid';
    return monthEnr[m.id] ? 'granted' : 'none';
  };

  const grantedCount = useMemo(
    () =>
      Object.values(packEnr).filter((e) => !e.source_payment_id).length +
      Object.values(monthEnr).filter((e) => !e.source_payment_id).length,
    [packEnr, monthEnr]
  );

  const monthsByYear = useMemo(() => {
    const g: Record<string, any[]> = {};
    months.forEach((m) => ((g[m.year] ??= []).push(m)));
    return Object.entries(g).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2Icon className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="text-center py-24">
        <ShieldAlertIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">Student not found</p>
        <button onClick={() => navigate('/admin/students')} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Students
        </button>
      </div>
    );
  }

  const inBatch = batchIds.size > 0;
  const vStatus: string = student.verification_status ?? 'approved';
  const hasIdUpload = Boolean(idUrls.front || idUrls.back);
  const studentBatches = (student.batch_members ?? []).map((m: any) => m.batch).filter(Boolean);
  const fade = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  const vHeroChip: Record<string, { cls: string; icon: any; label: string }> = {
    approved: { cls: 'bg-emerald-400/20 text-emerald-200 ring-emerald-300/30', icon: BadgeCheckIcon, label: 'ID verified' },
    pending: { cls: 'bg-amber-400/20 text-amber-100 ring-amber-300/30', icon: ShieldAlertIcon, label: 'ID pending' },
    rejected: { cls: 'bg-red-400/20 text-red-100 ring-red-300/30', icon: XCircleIcon, label: 'ID rejected' },
    unverified: { cls: 'bg-white/10 text-blue-100 ring-white/20', icon: ShieldCheckIcon, label: 'ID not submitted' }
  };
  const vChip = vHeroChip[vStatus] ?? vHeroChip.unverified;

  /* status chip for an access row */
  const StatusChip = ({ state }: { state: AccessState }) => {
    if (state === 'paid')
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
          <LockIcon className="w-3 h-3" /> Paid
        </span>
      );
    if (state === 'granted')
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
          <GiftIcon className="w-3 h-3" /> Free access
        </span>
      );
    return <span className="text-[11px] font-medium text-slate-400">No access</span>;
  };

  return (
    <div className="space-y-6">
      {/* back */}
      <button
        onClick={() => navigate('/admin/students')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Students
      </button>

      {/* ── identity hero ── */}
      <motion.div
        {...fade}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,#3b4a63_0%,#1e293b_45%,#0f172a_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg,#fff 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-3xl font-bold shrink-0">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials(student.full_name)
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
              <h1 className="text-2xl font-bold">{student.full_name || '(no name)'}</h1>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ring-1 ${vChip.cls}`}>
                <vChip.icon className="w-3.5 h-3.5" /> {vChip.label}
              </span>
              {!inBatch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30">
                  <ShieldAlertIcon className="w-3.5 h-3.5" /> No batch
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm tracking-widest text-blue-200/80">{student.student_code || '— no ID —'}</p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/10">
                {student.program ?? '—'} {student.exam_year ?? ''}
              </span>
              {studentBatches.map((b: any) => (
                <span key={b.id} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/10">
                  {b.name}
                </span>
              ))}
            </div>
          </div>

          {/* quick stats */}
          <div className="flex gap-3 shrink-0">
            <div className="min-w-[76px] rounded-2xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-black leading-none">{Object.keys(packEnr).length}</p>
              <p className="text-[11px] text-blue-100/70 mt-1">Packs</p>
            </div>
            <div className="min-w-[76px] rounded-2xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-black leading-none text-blue-200">{grantedCount}</p>
              <p className="text-[11px] text-blue-100/70 mt-1">Comped</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* LEFT column: info + batches + payments */}
        <div className="space-y-6 lg:col-span-1">
          {/* ── ID verification ── */}
          <Card icon={ShieldCheckIcon} title="ID verification" desc="Approve to unlock watching & buying." accent="text-[#c20f24] bg-red-50">
            <div className="mb-4">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                  vStatus === 'approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : vStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700'
                    : vStatus === 'rejected'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {vStatus === 'approved' ? 'Verified' : vStatus === 'pending' ? 'Pending review' : vStatus === 'rejected' ? 'Rejected' : 'Not submitted'}
              </span>
              {student.verification_submitted_at && (
                <span className="ml-2 text-xs text-slate-400">Submitted {fmtDate(student.verification_submitted_at)}</span>
              )}
            </div>

            {hasIdUpload ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(['front', 'back'] as const).map((side) => {
                  const url = idUrls[side];
                  return (
                    <div key={side}>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">{side}</p>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 hover:border-[#c20f24] transition-colors">
                          <img src={url} alt={`ID ${side}`} className="w-full h-24 object-cover" />
                        </a>
                      ) : (
                        <div className="h-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                          <IdCardIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-4">No ID uploaded yet.</p>
            )}

            {hasIdUpload && (
              <>
                {!showReject ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => decideVerification('approved')}
                      disabled={vBusy || vStatus === 'approved'}
                      className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <CheckIcon className="w-4 h-4" /> {vStatus === 'approved' ? 'Approved' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      disabled={vBusy}
                      className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <XCircleIcon className="w-4 h-4" /> Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason (shown to the student)"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => decideVerification('rejected')}
                        disabled={vBusy}
                        className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
                      >
                        Confirm reject
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setRejectReason(''); }}
                        className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card icon={UserIcon} title="Contact & details">
            <dl className="space-y-3 text-sm">
              {[
                { icon: MailIcon, label: 'Email', value: student.email },
                { icon: PhoneIcon, label: 'Phone', value: student.phone },
                { icon: MapPinIcon, label: 'Address', value: student.address || student.district },
                { icon: IdCardIcon, label: 'NIC', value: student.nic },
                { icon: CalendarIcon, label: 'Born', value: student.birth_date ? fmtDate(student.birth_date) : null },
                {
                  icon: UserIcon,
                  label: 'Guardian',
                  value: [student.guardian_name, student.guardian_phone].filter(Boolean).join(' · ')
                }
              ]
                .filter((r) => r.value)
                .map((r) => (
                  <div key={r.label} className="flex items-start gap-3">
                    <r.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wider text-slate-400">{r.label}</dt>
                      <dd className="text-slate-700 break-words">{r.value}</dd>
                    </div>
                  </div>
                ))}
              {student.school && (
                <div className="flex items-start gap-3">
                  <LayersIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-slate-400">School</dt>
                    <dd className="text-slate-700 break-words">{student.school}</dd>
                  </div>
                </div>
              )}
            </dl>
            <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">Joined {fmtDate(student.created_at)}</p>
          </Card>

          <Card icon={LayersIcon} title="Batches" desc="Assigning a batch verifies the student.">
            {batches.length === 0 ? (
              <p className="text-sm text-slate-400">No batches yet — create one first.</p>
            ) : (
              <div className="space-y-1.5">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm text-slate-700 flex-1">{b.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        b.program === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {b.program} {b.exam_year ?? ''}
                    </span>
                    {busy.has(`b:${b.id}`) ? (
                      <Loader2Icon className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : (
                      <Toggle on={batchIds.has(b.id)} onClick={() => toggleBatch(b.id)} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card icon={ReceiptTextIcon} title="Payment history" accent="text-violet-600 bg-violet-50">
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-sm border border-slate-100 rounded-xl px-3 py-2"
                  >
                    <span className="text-slate-600 min-w-0 truncate">
                      {p.kind === 'monthly_fee' ? `Monthly · ${p.period_month} ${p.period_year}` : p.kind} ·{' '}
                      {formatLKR(Number(p.amount))}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${statusBadge[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT column: the access manager (signature) */}
        <div className="lg:col-span-2">
          <Card
            icon={GiftIcon}
            title="Access manager"
            desc="Grant free access to a student who can't pay this month. Paid items are managed in Payments."
            accent="text-blue-600 bg-blue-50"
          >
            {/* video packs */}
            <div className="flex items-center gap-2 mb-3">
              <FilmIcon className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Video packs</h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">
                {packs.length}
              </span>
            </div>

            {packs.length === 0 ? (
              <p className="text-sm text-slate-400 mb-6">No published packs.</p>
            ) : (
              <div className="space-y-2 mb-8">
                {packs.map((p) => {
                  const state = packState(p.id);
                  const enr = packEnr[p.id];
                  const key = `p:${p.id}`;
                  const saving = busy.has(key);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PlayCircleIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                        <p className="text-xs text-slate-400">
                          {p.type || 'Pack'}
                          {p.is_free ? ' · Free for all' : p.price ? ` · ${formatLKR(Number(p.price))}` : ''}
                        </p>
                      </div>
                      <StatusChip state={state} />
                      {saving ? (
                        <Loader2Icon className="w-4 h-4 text-slate-400 animate-spin" />
                      ) : state === 'paid' ? (
                        <span className="w-11 flex justify-center" title="Paid — manage in Payments">
                          <LockIcon className="w-4 h-4 text-slate-300" />
                        </span>
                      ) : (
                        <Toggle
                          on={state === 'granted'}
                          onClick={() =>
                            state === 'granted' ? revoke(key, enr!.id) : grant(key, { pack_id: p.id })
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* monthly recordings */}
            <div className="flex items-center gap-2 mb-3">
              <VideoIcon className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly recordings</h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">
                {months.length}
              </span>
            </div>

            {months.length === 0 ? (
              <p className="text-sm text-slate-400">No published recordings.</p>
            ) : (
              <div className="space-y-5">
                {monthsByYear.map(([year, list]) => (
                  <div key={year}>
                    <p className="text-[11px] font-bold text-slate-400 mb-2">{year}</p>
                    <div className="space-y-2">
                      {list.map((m) => {
                        const state = monthState(m);
                        const enr = monthEnr[m.id];
                        const key = `m:${m.id}`;
                        const saving = busy.has(key);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                          >
                            <div className="w-14 h-10 rounded-lg overflow-hidden bg-violet-50 shrink-0 flex items-center justify-center">
                              {m.thumbnail_url ? (
                                <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <CalendarIcon className="w-5 h-5 text-violet-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {m.month} {m.year}
                              </p>
                              <p className="text-xs text-slate-400">
                                {m.session_count ?? 0} session{m.session_count === 1 ? '' : 's'}
                              </p>
                            </div>
                            <StatusChip state={state} />
                            {saving ? (
                              <Loader2Icon className="w-4 h-4 text-slate-400 animate-spin" />
                            ) : state === 'paid' ? (
                              <span className="w-11 flex justify-center" title="Paid — manage in Payments">
                                <LockIcon className="w-4 h-4 text-slate-300" />
                              </span>
                            ) : (
                              <Toggle
                                on={state === 'granted'}
                                onClick={() =>
                                  state === 'granted' ? revoke(key, enr!.id) : grant(key, { theory_month_id: m.id })
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* legend */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-blue-600" /> Toggle on = free access granted
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LockIcon className="w-3.5 h-3.5 text-emerald-500" /> Paid = unlocked by a verified payment
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* ── danger zone ── */}
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-red-700">Delete this student</h3>
            <p className="text-sm text-red-600/80 mt-0.5">
              Permanently removes the account and all their data — payments, access, progress and uploads. This cannot be undone.
            </p>
            {deleteError && <p className="text-sm font-medium text-red-700 mt-2">{deleteError}</p>}
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <Trash2Icon className="w-4 h-4" /> Delete student
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${student.full_name || 'this student'}?`}
        message={
          <>
            This permanently deletes the account and <strong>all their data</strong> (payments, access, progress, uploaded ID).
            This cannot be undone.
          </>
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete student'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
