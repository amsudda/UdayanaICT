import { useEffect, useState, useCallback } from 'react';
import {
  CheckIcon,
  XIcon,
  ReceiptTextIcon,
  ImageIcon,
  Loader2Icon,
  SearchIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { formatLKR } from '../../data/paymentConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Filter = 'pending' | 'approved' | 'rejected' | 'all';
const filters: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' }
];

const kindLabels: Record<string, string> = {
  monthly_fee: 'Monthly fee',
  pack: 'Extra class pack',
  theory: 'Theory recordings',
  tute: 'Tute fee',
  other: 'Other'
};
const typeOptions = [
  { key: 'all', label: 'All types' },
  { key: 'monthly_fee', label: 'Monthly fee' },
  { key: 'pack', label: 'Extra class pack' },
  { key: 'theory', label: 'Theory recordings' },
  { key: 'tute', label: 'Tute fee' },
  { key: 'other', label: 'Other' }
];

function kindLabel(p: any) {
  const base = kindLabels[p.kind] ?? 'Payment';
  if (p.kind === 'monthly_fee' && p.period_month) return `${base} · ${p.period_month} ${p.period_year ?? ''}`.trim();
  return base;
}
const batchOf = (p: any) => p.student?.batch_members?.[0]?.batch?.name as string | undefined;

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700'
};

const selectCls = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40';

export function AdminPaymentsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('pending');
  const [batchFilter, setBatchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    supabase.from('batches').select('id, name').order('exam_year', { ascending: false }).then(({ data }) => setBatches(data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    let studentIds: string[] | null = null;
    if (batchFilter !== 'all') {
      const { data: bm } = await supabase.from('batch_members').select('student_id').eq('batch_id', batchFilter);
      studentIds = (bm ?? []).map((r: any) => r.student_id);
      if (studentIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
    }

    let q = supabase
      .from('payments')
      .select('*, student:profiles!payments_student_id_fkey(full_name, student_code, phone, batch_members(batch:batches(name)))')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    if (typeFilter !== 'all') q = q.eq('kind', typeFilter);
    if (studentIds) q = q.in('student_id', studentIds);

    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  }, [filter, batchFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = rows.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.student?.full_name ?? '').toLowerCase().includes(q) || (p.student?.student_code ?? '').toLowerCase().includes(q);
  });

  const pendingTotal = visible.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);

  const approve = async (p: any) => {
    setBusyId(p.id);
    await supabase.from('payments').update({ status: 'approved', reviewed_by: user?.id }).eq('id', p.id);
    setBusyId(null);
    load();
  };
  const doReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    await supabase.from('payments').update({ status: 'rejected', reject_reason: reason.trim() || null, reviewed_by: user?.id }).eq('id', rejectTarget.id);
    setBusyId(null);
    setRejectTarget(null);
    setReason('');
    load();
  };
  const viewSlip = async (path: string) => {
    if (!path) return;
    setSlipLoading(true);
    setSlipUrl('');
    if (path.startsWith('data:') || path.startsWith('http')) {
      setSlipUrl(path);
      setSlipLoading(false);
      return;
    }
    const { data } = await supabase.storage.from('slips').createSignedUrl(path, 120);
    setSlipUrl(data?.signedUrl ?? null);
    setSlipLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Payments to verify</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Approve a deposit slip to unlock the student's access, or reject it with a reason.
      </p>

      {/* status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select className={selectCls} value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="all">All batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className={selectCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {typeOptions.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className={`${selectCls} w-full pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name or ID…" />
        </div>
      </div>

      {/* summary bar */}
      {!loading && visible.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-slate-500">{visible.length} payment{visible.length === 1 ? '' : 's'}</span>
          {pendingTotal > 0 && (
            <span className="font-semibold text-amber-700">Pending total: {formatLKR(pendingTotal)}</span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <ReceiptTextIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Nothing here</p>
          <p className="text-sm text-slate-400 mt-1">No payments match these filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">{p.student?.full_name || '(unknown)'}</p>
                  <span className="text-xs text-slate-400">{p.student?.student_code}</span>
                  {batchOf(p) && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{batchOf(p)}</span>}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${statusBadge[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {kindLabel(p)} · <span className="font-semibold">{formatLKR(Number(p.amount))}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                  {p.reference ? ` · ${p.reference}` : ''}
                  {p.reject_reason ? ` · Reason: ${p.reject_reason}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => viewSlip(p.slip_url)} disabled={!p.slip_url} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ImageIcon className="w-4 h-4" /> Slip
                </button>
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => approve(p)} disabled={busyId === p.id} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                      {busyId === p.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />} Approve
                    </button>
                    <button onClick={() => { setRejectTarget(p); setReason(''); }} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50">
                      <XIcon className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* slip lightbox */}
      {(slipUrl !== null || slipLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setSlipUrl(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative max-w-lg w-full">
            {slipLoading ? (
              <div className="flex items-center justify-center h-40 text-white"><Loader2Icon className="w-6 h-6 animate-spin" /></div>
            ) : slipUrl ? (
              <img src={slipUrl} alt="Deposit slip" className="w-full rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
            ) : (
              <p className="text-center text-white">Could not load slip.</p>
            )}
          </div>
        </div>
      )}

      {/* reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 text-lg">Reject payment</h3>
            <p className="text-sm text-slate-500 mt-1">The student will see this reason. (Optional)</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Slip is unclear, amount doesn't match…" className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={doReject} className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
