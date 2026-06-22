import { useEffect, useState, useCallback } from 'react';
import { SearchIcon, UsersIcon, MailIcon, PhoneIcon, AlertCircleIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { formatLKR } from '../../data/paymentConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

const selectCls = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40';
const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700'
};

export function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');

  // detail
  const [detail, setDetail] = useState<any | null>(null);
  const [detailBatchIds, setDetailBatchIds] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ss }, { data: bs }] = await Promise.all([
      supabase.from('profiles').select('*, batch_members(batch:batches(id,name))').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false })
    ]);
    setStudents(ss ?? []);
    setBatches(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const batchesOf = (s: any) => (s.batch_members ?? []).map((m: any) => m.batch).filter(Boolean);

  const visible = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || [s.full_name, s.email, s.student_code, s.phone].some((v: string) => (v ?? '').toLowerCase().includes(q));
    const bIds = batchesOf(s).map((b: any) => b.id);
    const matchBatch =
      batchFilter === 'all' ? true : batchFilter === 'unassigned' ? bIds.length === 0 : bIds.includes(batchFilter);
    return matchSearch && matchBatch;
  });

  const unassignedCount = students.filter((s) => batchesOf(s).length === 0).length;

  const openDetail = async (s: any) => {
    setDetail(s);
    setDetailBatchIds(new Set(batchesOf(s).map((b: any) => b.id)));
    const [{ data: pays }, { data: enr }] = await Promise.all([
      supabase.from('payments').select('*').eq('student_id', s.id).order('created_at', { ascending: false }),
      supabase.from('enrollments').select('pack:packs(title), theory:theory_months(month, year)').eq('student_id', s.id)
    ]);
    setPayments(pays ?? []);
    setEnrollments(enr ?? []);
  };

  const toggleBatch = async (batchId: string) => {
    if (!detail) return;
    if (detailBatchIds.has(batchId)) {
      await supabase.from('batch_members').delete().eq('batch_id', batchId).eq('student_id', detail.id);
      setDetailBatchIds((p) => { const n = new Set(p); n.delete(batchId); return n; });
    } else {
      await supabase.from('batch_members').insert({ batch_id: batchId, student_id: detail.id });
      setDetailBatchIds((p) => new Set([...p, batchId]));
    }
    load();
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' });
  const initials = (n?: string) => (n ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Students</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Assign students to a batch to verify them and give them access.
      </p>

      {/* unassigned alert */}
      {unassignedCount > 0 && (
        <button
          onClick={() => setBatchFilter('unassigned')}
          className="flex items-center gap-3 w-full mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 hover:bg-amber-100 transition-colors text-left"
        >
          <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 flex-1">
            <span className="font-bold">{unassignedCount}</span> student{unassignedCount > 1 ? 's' : ''} not in a batch yet — assign them to verify.
          </span>
        </button>
      )}

      {/* filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select className={selectCls} value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="all">All students</option>
          <option value="unassigned">Unassigned</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className={`${selectCls} w-full pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone or ID…" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <UsersIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No students</p>
          <p className="text-sm text-slate-400 mt-1">None match these filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((s) => {
            const bs = batchesOf(s);
            return (
              <button key={s.id} onClick={() => openDetail(s)} className="w-full flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-left hover:border-slate-300 transition-colors">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(s.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">{s.full_name || '(no name)'}</p>
                    <span className="text-xs text-slate-400">{s.student_code}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.program ?? '—'}{s.exam_year ? ` ${s.exam_year}` : ''} · {s.email}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {bs.length === 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-700">Needs batch</span>
                  ) : (
                    bs.slice(0, 2).map((b: any) => <span key={b.id} className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600">{b.name}</span>)
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* detail drawer */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.full_name || 'Student'}>
        {detail && (
          <div className="space-y-6">
            {/* identity */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold overflow-hidden shrink-0">
                {detail.avatar_url ? <img src={detail.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(detail.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{detail.full_name || '(no name)'}</p>
                <p className="text-xs text-slate-500">{detail.student_code} · {detail.program ?? '—'} {detail.exam_year ?? ''}</p>
              </div>
            </div>

            {/* contact / info */}
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600"><MailIcon className="w-4 h-4 text-slate-400" /> {detail.email || '—'}</p>
              <p className="flex items-center gap-2 text-slate-600"><PhoneIcon className="w-4 h-4 text-slate-400" /> {detail.phone || '—'}</p>
              {detail.school && <p className="text-slate-600"><span className="text-slate-400">School:</span> {detail.school}</p>}
              {detail.district && <p className="text-slate-600"><span className="text-slate-400">District:</span> {detail.district}</p>}
              {detail.nic && <p className="text-slate-600"><span className="text-slate-400">NIC:</span> {detail.nic}</p>}
              {detail.guardian_phone && <p className="text-slate-600"><span className="text-slate-400">Guardian:</span> {detail.guardian_name || ''} {detail.guardian_phone}</p>}
            </div>

            {/* batches */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Batches (assign = verify)</p>
              {batches.length === 0 ? (
                <p className="text-sm text-slate-400">No batches yet — create one first.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {batches.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={detailBatchIds.has(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded accent-blue-600" />
                      <span className="text-sm text-slate-700">{b.name}</span>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${b.program === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{b.program}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* owned content */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Owns</p>
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-400">No purchased packs yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {enrollments.map((e, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {e.pack?.title || (e.theory ? `${e.theory.month} ${e.theory.year}` : 'Item')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* payments */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent payments</p>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-400">No payments yet.</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm border border-slate-100 rounded-lg px-3 py-2">
                      <span className="text-slate-600 min-w-0 truncate">
                        {p.kind === 'monthly_fee' ? `Monthly · ${p.period_month} ${p.period_year}` : p.kind} · {formatLKR(Number(p.amount))}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${statusBadge[p.status]}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">Joined {fmtDate(detail.created_at)}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
