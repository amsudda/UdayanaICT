import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircleIcon, ArrowLeftIcon, BanknoteIcon, CalendarIcon, CheckCircle2Icon, CheckIcon,
  ChevronRightIcon, Clock3Icon, DownloadIcon, FileTextIcon, HashIcon, HistoryIcon, ImageIcon,
  Loader2Icon, PackageIcon, PhoneIcon, ReceiptTextIcon, RefreshCwIcon, RotateCwIcon,
  SearchXIcon, ShieldCheckIcon, UserIcon, WifiIcon, XIcon, ZoomInIcon, ZoomOutIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { formatLKR } from '../../data/paymentConfig';
import { Button, EmptyState, Initials, Modal, PageHeader, SearchInput, StatusPill } from '../components/ui';

type PaymentStatus = 'pending' | 'approved' | 'rejected';
type Filter = PaymentStatus | 'all';
type BatchMembership = { batch?: { id?: string; name?: string } | null };

type PaymentRow = {
  id: string;
  student_id: string;
  kind: string;
  amount: number | string | null;
  reference?: string | null;
  slip_url?: string | null;
  status: PaymentStatus;
  reject_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  period_month?: string | null;
  period_year?: number | null;
  student?: {
    full_name?: string | null;
    student_code?: string | null;
    phone?: string | null;
    batch_members?: BatchMembership[] | null;
  } | null;
  pack?: { title?: string | null } | null;
  theory?: { month?: string | null; year?: number | null } | null;
  reviewer_name?: string | null;
};

const STATUS_FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' }
];

const KIND_LABELS: Record<string, string> = {
  monthly_fee: 'Monthly fee', pack: 'Extra class pack', theory: 'Theory recordings', tute: 'Tute fee', other: 'Other'
};

const TYPE_OPTIONS = [
  { key: 'all', label: 'All payment types' },
  { key: 'monthly_fee', label: 'Monthly fee' },
  { key: 'pack', label: 'Extra class pack' },
  { key: 'theory', label: 'Theory recordings' },
  { key: 'tute', label: 'Tute fee' },
  { key: 'other', label: 'Other' }
];

const REJECTION_REASONS = [
  'Slip is unclear or unreadable', 'Amount does not match', 'Wrong bank account or recipient',
  'Duplicate payment submission', 'Payment details are missing', 'Other'
];

const selectClass = 'h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition-[border-color,box-shadow] focus-visible:border-[#c20f24]/40 focus-visible:ring-2 focus-visible:ring-[#c20f24]/15';

function paymentPurpose(payment: PaymentRow) {
  if (payment.kind === 'pack') return { label: 'Video pack', detail: payment.pack?.title ?? 'Pack unavailable', Icon: PackageIcon };
  if (payment.kind === 'monthly_fee') {
    const period = [payment.period_month, payment.period_year].filter(Boolean).join(' ');
    return { label: 'Monthly fee', detail: period || 'Month not specified', Icon: CalendarIcon };
  }
  if (payment.kind === 'theory') {
    const period = payment.theory
      ? `${payment.theory.month ?? ''} ${payment.theory.year ?? ''}`.trim()
      : [payment.period_month, payment.period_year].filter(Boolean).join(' ');
    return { label: 'Monthly recordings', detail: period || 'Month not specified', Icon: CalendarIcon };
  }
  return { label: KIND_LABELS[payment.kind] ?? 'Payment', detail: payment.reference ?? '', Icon: FileTextIcon };
}

function batchNames(payment: PaymentRow) {
  return (payment.student?.batch_members ?? [])
    .map((membership) => membership.batch?.name)
    .filter((name): name is string => Boolean(name));
}

function relativeAge(value: string) {
  const milliseconds = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString('en-LK', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

function statusTone(status: PaymentStatus): 'amber' | 'green' | 'red' {
  return status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber';
}

function filterPayments(
  payments: PaymentRow[],
  status: Filter,
  type: string,
  batch: string,
  searchValue: string
) {
  const query = searchValue.trim().toLowerCase();
  return payments.filter((payment) => {
    if (status !== 'all' && payment.status !== status) return false;
    if (type !== 'all' && payment.kind !== type) return false;
    if (batch !== 'all' && !(payment.student?.batch_members ?? []).some((membership) => membership.batch?.id === batch)) return false;
    if (!query) return true;
    return [payment.student?.full_name, payment.student?.student_code, payment.student?.phone, payment.reference]
      .some((value) => (value ?? '').toLowerCase().includes(query));
  }).sort((a, b) => {
    const difference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return status === 'pending' ? difference : -difference;
  });
}

function Metric({ icon: Icon, label, value, detail, tone }: {
  icon: typeof ReceiptTextIcon;
  label: string;
  value: string;
  detail: string;
  tone: 'red' | 'amber' | 'slate';
}) {
  const colors = { red: 'bg-red-50 text-[#c20f24]', amber: 'bg-amber-50 text-amber-700', slate: 'bg-slate-100 text-slate-600' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-950 sm:text-2xl">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ payment, selected, onSelect }: { payment: PaymentRow; selected: boolean; onSelect: () => void }) {
  const purpose = paymentPurpose(payment);
  const batches = batchNames(payment);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Open ${payment.status} payment from ${payment.student?.full_name || 'unknown student'}`}
      className={`group w-full border-b border-slate-100 px-4 py-4 text-left outline-none transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c20f24]/35 sm:px-5 ${selected ? 'bg-red-50/65' : 'bg-white hover:bg-slate-50/80'}`}
    >
      <div className="flex items-start gap-3">
        <Initials name={payment.student?.full_name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{payment.student?.full_name || 'Unknown student'}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                {payment.student?.student_code || 'No student ID'}{batches[0] ? ` · ${batches[0]}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{formatLKR(Number(payment.amount ?? 0))}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-700">{purpose.detail || purpose.label}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Clock3Icon className="h-3 w-3" /> {relativeAge(payment.created_at)} · {payment.status === 'pending' ? 'Select to review' : 'Open slip & details'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!payment.slip_url && <AlertCircleIcon className="h-4 w-4 text-red-500" aria-label="Slip missing" />}
              <StatusPill tone={statusTone(payment.status)}>{payment.status}</StatusPill>
              <ChevronRightIcon className={`h-4 w-4 transition-transform ${selected ? 'translate-x-0.5 text-[#c20f24]' : 'text-slate-300 group-hover:translate-x-0.5'}`} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function SlipViewer({ payment, url, loading, error, zoom, rotation, onZoomIn, onZoomOut, onRotate }: {
  payment: PaymentRow;
  url: string | null;
  loading: boolean;
  error: string | null;
  zoom: number;
  rotation: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
      <div className="flex min-h-[330px] items-center justify-center overflow-auto p-4 sm:min-h-[430px]">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-300"><Loader2Icon className="h-6 w-6 animate-spin" /><p className="text-xs font-medium">Loading deposit slip…</p></div>
        ) : error || !url ? (
          <div className="max-w-xs px-6 text-center text-slate-300">
            <ImageIcon className="mx-auto h-9 w-9 text-slate-600" />
            <p className="mt-3 text-sm font-bold text-white">{payment.slip_url ? 'Slip unavailable' : 'No slip attached'}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{error || 'This payment cannot be approved until its evidence is available.'}</p>
          </div>
        ) : (
          <img
            src={url}
            alt={`Deposit slip submitted by ${payment.student?.full_name || 'student'}`}
            className="max-h-[540px] max-w-full select-none object-contain transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
          />
        )}
      </div>
      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-white/10 bg-slate-900 px-3 py-2">
        <p className="hidden truncate pl-1 text-[11px] font-medium text-slate-400 sm:block">Payment evidence</p>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={onZoomOut} disabled={!url || zoom <= 0.75} aria-label="Zoom out" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"><ZoomOutIcon className="h-4 w-4" /></button>
          <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-slate-400">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={onZoomIn} disabled={!url || zoom >= 1.75} aria-label="Zoom in" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"><ZoomInIcon className="h-4 w-4" /></button>
          <button type="button" onClick={onRotate} disabled={!url} aria-label="Rotate slip" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"><RotateCwIcon className="h-4 w-4" /></button>
          {url && <a href={url} target="_blank" rel="noreferrer" aria-label="Open deposit slip in a new tab" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"><DownloadIcon className="h-4 w-4" /></a>}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-0.5 break-words text-[13px] font-semibold text-slate-800">{value}</p></div>
    </div>
  );
}

function PaymentDetail({ payment, history, slipUrl, slipLoading, slipError, zoom, rotation, busy, onZoomIn, onZoomOut, onRotate, onApprove, onReject }: {
  payment: PaymentRow;
  history: PaymentRow[];
  slipUrl: string | null;
  slipLoading: boolean;
  slipError: string | null;
  zoom: number;
  rotation: number;
  busy: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const purpose = paymentPurpose(payment);
  const batches = batchNames(payment);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Initials name={payment.student?.full_name} size={44} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-bold text-slate-950">{payment.student?.full_name || 'Unknown student'}</h2><StatusPill tone={statusTone(payment.status)}>{payment.status}</StatusPill></div>
              <p className="mt-1 text-xs text-slate-500">{payment.student?.student_code || 'No student ID'}{batches.length ? ` · ${batches.join(', ')}` : ''}</p>
            </div>
          </div>
          <div className="sm:text-right"><p className="text-2xl font-bold tabular-nums tracking-tight text-slate-950">{formatLKR(Number(payment.amount ?? 0))}</p><p className="mt-1 text-[11px] font-medium text-slate-400">Submitted {relativeAge(payment.created_at)}</p></div>
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#c20f24] ring-1 ring-slate-200"><purpose.Icon className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Payment for</p><p className="mt-0.5 truncate text-sm font-bold text-slate-900">{purpose.detail || purpose.label}</p></div>
          <span className="ml-auto hidden shrink-0 text-xs font-semibold text-slate-500 sm:block">{purpose.label}</span>
        </div>

        <SlipViewer payment={payment} url={slipUrl} loading={slipLoading} error={slipError} zoom={zoom} rotation={rotation} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onRotate={onRotate} />

        <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
          <DetailItem icon={HashIcon} label="Reference" value={payment.reference || 'Not provided'} />
          <DetailItem icon={Clock3Icon} label="Submitted" value={formatDateTime(payment.created_at)} />
          <DetailItem icon={PhoneIcon} label="Phone" value={payment.student?.phone || 'Not provided'} />
          <DetailItem icon={ReceiptTextIcon} label="Payment type" value={purpose.label} />
        </div>

        {payment.status !== 'pending' && (
          <div className={`rounded-2xl border p-4 ${payment.status === 'approved' ? 'border-emerald-200 bg-emerald-50/70' : 'border-red-200 bg-red-50/70'}`}>
            <div className="flex items-start gap-3">
              {payment.status === 'approved' ? <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
              <div><p className="text-sm font-bold text-slate-900">Payment {payment.status}</p><p className="mt-1 text-xs leading-5 text-slate-600">{payment.reviewer_name ? `Reviewed by ${payment.reviewer_name}` : 'Reviewed by an administrator'} · {formatDateTime(payment.reviewed_at)}</p>{payment.reject_reason && <p className="mt-2 text-xs font-medium text-red-700">Reason: {payment.reject_reason}</p>}</div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><HistoryIcon className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-bold text-slate-900">Recent payment history</h3></div>
            <Link to={`/admin/students/${payment.student_id}`} className="text-xs font-bold text-[#c20f24] hover:underline">View student</Link>
          </div>
          {history.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {history.slice(0, 3).map((item) => {
                const itemPurpose = paymentPurpose(item);
                return <div key={item.id} className="flex items-center gap-3 px-3.5 py-3"><StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill><p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{itemPurpose.detail || itemPurpose.label}</p><p className="shrink-0 text-xs font-bold tabular-nums text-slate-900">{formatLKR(Number(item.amount ?? 0))}</p></div>;
              })}
            </div>
          ) : <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">No previous payments from this student.</p>}
        </div>
      </div>

      {payment.status === 'pending' && (
        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:px-6">
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">Verify the slip before deciding</p><p className="mt-0.5 text-[11px] text-slate-400">Approval may unlock paid class access immediately.</p></div>
          <div className="flex gap-2">
            <button type="button" onClick={onReject} disabled={busy} className="h-11 flex-1 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:flex-none">Reject</button>
            <button type="button" onClick={onApprove} disabled={busy || !slipUrl || slipLoading} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">{busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />} Approve payment</button>
          </div>
        </footer>
      )}
    </section>
  );
}

export function AdminPaymentsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('pending');
  const [batchFilter, setBatchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [archiveDetailOpen, setArchiveDetailOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PaymentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRow | null>(null);
  const [reasonPreset, setReasonPreset] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const archiveCloseButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true); else setRefreshing(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, student:profiles!payments_student_id_fkey(full_name, student_code, phone, batch_members(batch:batches(id, name))), pack:packs(title), theory:theory_months(month, year)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const payments = (data ?? []) as PaymentRow[];
      const reviewerIds = [...new Set(payments.map((payment) => payment.reviewed_by).filter((id): id is string => Boolean(id)))];
      const reviewerNames = new Map<string, string>();
      if (reviewerIds.length) {
        const { data: reviewers } = await supabase.from('profiles').select('id, full_name').in('id', reviewerIds);
        (reviewers ?? []).forEach((reviewer: { id: string; full_name?: string | null }) => reviewerNames.set(reviewer.id, reviewer.full_name || 'Administrator'));
      }
      setRows(payments.map((payment) => ({ ...payment, reviewer_name: payment.reviewed_by ? reviewerNames.get(payment.reviewed_by) ?? null : null })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    supabase.from('batches').select('id, name').order('exam_year', { ascending: false }).then(({ data }) => setBatches(data ?? []));
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel('admin-payment-review-workspace').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => load(false)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const counts = useMemo(() => ({
    pending: rows.filter((payment) => payment.status === 'pending').length,
    approved: rows.filter((payment) => payment.status === 'approved').length,
    rejected: rows.filter((payment) => payment.status === 'rejected').length,
    all: rows.length
  }), [rows]);
  const pendingPayments = useMemo(() => rows.filter((payment) => payment.status === 'pending'), [rows]);
  const pendingTotal = useMemo(() => pendingPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0), [pendingPayments]);
  const oldestPending = useMemo(() => pendingPayments.reduce<PaymentRow | null>((oldest, payment) => {
    if (!oldest) return payment;
    return new Date(payment.created_at).getTime() < new Date(oldest.created_at).getTime() ? payment : oldest;
  }, null), [pendingPayments]);

  const visible = useMemo(
    () => filterPayments(rows, filter, typeFilter, batchFilter, search),
    [rows, filter, typeFilter, batchFilter, search]
  );

  const selected = useMemo(() => rows.find((payment) => payment.id === selectedId) ?? null, [rows, selectedId]);
  const selectedHistory = useMemo(() => selected ? rows.filter((payment) => payment.student_id === selected.student_id && payment.id !== selected.id) : [], [rows, selected]);

  useEffect(() => {
    if (!visible.length) {
      setSelectedId(null);
      setMobileDetailOpen(false);
      setArchiveDetailOpen(false);
      return;
    }
    if (!selectedId || !visible.some((payment) => payment.id === selectedId)) setSelectedId(visible[0].id);
  }, [visible, selectedId]);

  useEffect(() => {
    let cancelled = false;
    setSlipUrl(null); setSlipError(null); setZoom(1); setRotation(0);
    if (!selected?.slip_url) { setSlipLoading(false); return; }
    const resolveSlip = async () => {
      setSlipLoading(true);
      const path = selected.slip_url as string;
      if (path.startsWith('data:') || path.startsWith('http')) {
        if (!cancelled) { setSlipUrl(path); setSlipLoading(false); }
        return;
      }
      const { data, error } = await supabase.storage.from('slips').createSignedUrl(path, 300);
      if (cancelled) return;
      if (error || !data?.signedUrl) setSlipError(error?.message || 'Could not create a secure link for this slip.');
      else setSlipUrl(data.signedUrl);
      setSlipLoading(false);
    };
    resolveSlip();
    return () => { cancelled = true; };
  }, [selected?.id, selected?.slip_url]);

  useEffect(() => {
    if (!mobileDetailOpen && !archiveDetailOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileDetailOpen(false);
      setArchiveDetailOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [mobileDetailOpen, archiveDetailOpen]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!archiveDetailOpen) return;
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => archiveCloseButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      returnFocusTo?.focus();
    };
  }, [archiveDetailOpen]);

  const selectPayment = (payment: PaymentRow) => {
    setSelectedId(payment.id);
    setActionError(null);
    if (payment.status !== 'pending') {
      setArchiveDetailOpen(true);
      setMobileDetailOpen(false);
      return;
    }
    if (window.matchMedia('(max-width: 1023px)').matches) setMobileDetailOpen(true);
  };

  const changeStatusFilter = (nextFilter: Filter) => {
    const nextVisible = filterPayments(rows, nextFilter, typeFilter, batchFilter, search);
    setFilter(nextFilter);
    setSelectedId(nextVisible[0]?.id ?? null);
    setMobileDetailOpen(false);
    setArchiveDetailOpen(false);
    setActionError(null);
  };

  const approve = async () => {
    if (!approveTarget) return;
    const target = approveTarget;
    setBusyId(target.id); setActionError(null);
    const { data, error } = await supabase.from('payments')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), reject_reason: null })
      .eq('id', target.id).eq('status', 'pending').select('id');
    setBusyId(null); setApproveTarget(null);
    if (error) { setActionError(error.message); return; }
    if (!data?.length) { setActionError('This payment was already reviewed by another administrator. The queue has been refreshed.'); await load(false); return; }
    setSuccess(`${target.student?.full_name || 'Student'}’s payment was approved.`);
    await load(false);
  };

  const rejectionReason = reasonPreset === 'Other' ? reasonDetail.trim() : [reasonPreset, reasonDetail.trim()].filter(Boolean).join(' — ');
  const reject = async () => {
    if (!rejectTarget || !rejectionReason) return;
    const target = rejectTarget;
    setBusyId(target.id); setActionError(null);
    const { data, error } = await supabase.from('payments')
      .update({ status: 'rejected', reject_reason: rejectionReason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', target.id).eq('status', 'pending').select('id');
    setBusyId(null); setRejectTarget(null); setReasonPreset(''); setReasonDetail('');
    if (error) { setActionError(error.message); return; }
    if (!data?.length) { setActionError('This payment was already reviewed by another administrator. The queue has been refreshed.'); await load(false); return; }
    setSuccess(`${target.student?.full_name || 'Student'}’s payment was rejected.`);
    await load(false);
  };

  const clearFilters = () => { setFilter('pending'); setBatchFilter('all'); setTypeFilter('all'); setSearch(''); setArchiveDetailOpen(false); };

  const detail = selected ? (
    <PaymentDetail
      payment={selected} history={selectedHistory} slipUrl={slipUrl} slipLoading={slipLoading} slipError={slipError}
      zoom={zoom} rotation={rotation} busy={busyId === selected.id}
      onZoomIn={() => setZoom((value) => Math.min(1.75, value + 0.25))}
      onZoomOut={() => setZoom((value) => Math.max(0.75, value - 0.25))}
      onRotate={() => setRotation((value) => (value + 90) % 360)}
      onApprove={() => setApproveTarget(selected)}
      onReject={() => { setRejectTarget(selected); setReasonPreset(''); setReasonDetail(''); }}
    />
  ) : null;

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Payment review" description="Verify bank-transfer evidence and safely unlock student access." actions={<Button variant="secondary" icon={refreshing ? Loader2Icon : RefreshCwIcon} onClick={() => load(false)} disabled={refreshing}>Refresh</Button>} />

      {loadError && <div role="alert" className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircleIcon className="h-5 w-5 shrink-0" /><p className="flex-1">{loadError}</p><button type="button" onClick={() => load(true)} className="font-bold hover:underline">Try again</button></div>}
      {actionError && <div role="alert" className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircleIcon className="h-5 w-5 shrink-0" /><p className="flex-1">{actionError}</p><button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error" className="rounded-lg p-1 hover:bg-red-100"><XIcon className="h-4 w-4" /></button></div>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric icon={ReceiptTextIcon} label="Pending reviews" value={String(counts.pending)} detail={counts.pending ? 'Requires your decision' : 'Queue is clear'} tone="red" />
        <Metric icon={BanknoteIcon} label="Pending value" value={formatLKR(pendingTotal)} detail="Across submitted transfers" tone="amber" />
        <Metric icon={Clock3Icon} label="Oldest waiting" value={oldestPending ? relativeAge(oldestPending.created_at) : '—'} detail={oldestPending ? 'Review oldest submissions first' : 'Nothing waiting'} tone="slate" />
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 hide-scrollbar">
          {STATUS_FILTERS.map((item) => (
            <button type="button" key={item.key} onClick={() => changeStatusFilter(item.key)} aria-pressed={filter === item.key} className={`flex h-9 min-w-fit items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#c20f24]/30 ${filter === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {item.label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${filter === item.key ? 'bg-red-50 text-[#c20f24]' : 'bg-slate-200/70 text-slate-500'}`}>{counts[item.key]}</span>
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600 sm:flex"><WifiIcon className="h-3.5 w-3.5" /> Live</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_190px_auto]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search student, ID, phone or reference…" />
          <select aria-label="Filter by batch" className={selectClass} value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}><option value="all">All batches</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select>
          <select aria-label="Filter by payment type" className={selectClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{TYPE_OPTIONS.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}</select>
          <Button variant="ghost" onClick={clearFilters} className="px-3">Clear</Button>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(330px,0.72fr)_minmax(0,1.28fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <div><h2 className="text-sm font-bold text-slate-900">Review queue</h2><p className="mt-0.5 text-[11px] text-slate-400">{visible.length} payment{visible.length === 1 ? '' : 's'} · {filter === 'pending' ? 'oldest first' : 'newest first'}</p></div>
            {refreshing && <Loader2Icon className="h-4 w-4 animate-spin text-slate-400" aria-label="Refreshing payments" />}
          </header>
          <div data-lenis-prevent className="max-h-[calc(100vh-260px)] min-h-[360px] overflow-y-auto">
            {loading ? <div className="space-y-1 p-3" aria-label="Loading payments">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div>
              : visible.length ? visible.map((payment) => <QueueRow key={payment.id} payment={payment} selected={payment.id === selectedId} onSelect={() => selectPayment(payment)} />)
                : <EmptyState icon={filter === 'pending' && !search && batchFilter === 'all' && typeFilter === 'all' ? CheckCircle2Icon : SearchXIcon} title={filter === 'pending' && !search && batchFilter === 'all' && typeFilter === 'all' ? 'All caught up' : 'No matching payments'} description={filter === 'pending' && !search && batchFilter === 'all' && typeFilter === 'all' ? 'Every submitted payment has been reviewed.' : 'Try changing or clearing the current filters.'} action={filter === 'pending' && !search && batchFilter === 'all' && typeFilter === 'all' ? undefined : <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />}
          </div>
        </section>

        <div className="sticky top-8 hidden lg:block">
          {detail || <section className="rounded-2xl border border-dashed border-slate-300 bg-white py-24"><EmptyState icon={ReceiptTextIcon} title="Select a payment" description="Choose a payment from the review queue to inspect its evidence and details." /></section>}
        </div>
      </div>

      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-[65] flex flex-col bg-[#FAF9F8] lg:hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3"><button type="button" onClick={() => setMobileDetailOpen(false)} aria-label="Back to payment queue" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><ArrowLeftIcon className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">Review payment</p><p className="truncate text-[11px] text-slate-400">{selected.student?.full_name || 'Unknown student'}</p></div></header>
          <div data-lenis-prevent className="flex-1 overflow-y-auto p-3 sm:p-5">{detail}</div>
        </div>
      )}

      {archiveDetailOpen && selected && selected.status !== 'pending' && (
        <div role="dialog" aria-modal="true" aria-label={`${selected.status} payment details`} className="fixed inset-0 z-[70] flex flex-col bg-[#FAF9F8]">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-950 sm:text-base">{selected.status === 'approved' ? 'Approved payment' : 'Rejected payment'}</p>
                <StatusPill tone={statusTone(selected.status)}>{selected.status}</StatusPill>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Slip and review details for {selected.student?.full_name || 'unknown student'}</p>
            </div>
            <button ref={archiveCloseButtonRef} type="button" onClick={() => setArchiveDetailOpen(false)} aria-label="Close payment details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#c20f24]/25">
              <XIcon className="h-5 w-5" />
            </button>
          </header>
          <main data-lenis-prevent className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="mx-auto max-w-5xl">{detail}</div>
          </main>
        </div>
      )}

      <Modal
        open={Boolean(approveTarget)}
        onClose={() => { if (!busyId) setApproveTarget(null); }}
        title="Approve this payment?"
        description="Confirm the evidence and access that will be granted."
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setApproveTarget(null)} disabled={Boolean(busyId)}>Cancel</Button><button type="button" onClick={approve} disabled={Boolean(busyId)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busyId ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />} Confirm approval</button></div>}
      >
        {approveTarget && <div className="space-y-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-slate-900">{approveTarget.student?.full_name || 'Unknown student'}</p><p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{formatLKR(Number(approveTarget.amount ?? 0))}</p></div><p className="text-sm leading-6 text-slate-600">Approving this payment will mark it as verified{['pack', 'theory'].includes(approveTarget.kind) ? ` and immediately unlock “${paymentPurpose(approveTarget).detail}”` : ''}.</p></div>}
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => {
          if (busyId) return;
          setRejectTarget(null);
          setReasonPreset('');
          setReasonDetail('');
        }}
        title="Reject this payment?"
        description="Select a quick reason or write your own. The student will see the final message."
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={Boolean(busyId)}>Cancel</Button><Button variant="danger" icon={busyId ? Loader2Icon : XIcon} onClick={reject} disabled={Boolean(busyId) || !rejectionReason}>Reject payment</Button></div>}
      >
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Quick reasons (optional)</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {REJECTION_REASONS.map((reason) => (
              <button
                type="button"
                key={reason}
                aria-pressed={reasonPreset === reason}
                onClick={() => setReasonPreset((current) => current === reason ? '' : reason)}
                className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-red-200 ${reasonPreset === reason ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{reason}</span>
                {reasonPreset === reason && <CheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block">
          <span className="text-xs font-bold text-slate-700">Write a custom reason</span>
          <span className="mt-1 block text-[11px] leading-5 text-slate-400">Use this on its own, or add extra details to the selected quick reason.</span>
          <textarea
            value={reasonDetail}
            onChange={(event) => setReasonDetail(event.target.value)}
            rows={3}
            placeholder="Explain why this payment cannot be approved…"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus-visible:border-red-300 focus-visible:ring-2 focus-visible:ring-red-100"
          />
        </label>

        {rejectionReason && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-500">Message the student will see</p>
            <p className="mt-1.5 text-xs font-medium leading-5 text-red-800">{rejectionReason}</p>
          </div>
        )}
      </Modal>

      {success && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-2xl"><CheckCircle2Icon className="h-5 w-5 shrink-0 text-emerald-400" /><p className="text-sm font-semibold">{success}</p></div>}
    </div>
  );
}
