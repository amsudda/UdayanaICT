import { useEffect, useState, useCallback } from 'react';
import { SearchIcon, UsersIcon, MailIcon, PhoneIcon, AlertCircleIcon, ChevronDownIcon, FolderIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { formatLKR } from '../../data/paymentConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700'
};
const PROGRAMS = ['A/L', 'O/L'];

export function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  // detail
  const [detail, setDetail] = useState<any | null>(null);
  const [detailBatchIds, setDetailBatchIds] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ss }, { data: bs }] = await Promise.all([
      supabase.from('profiles').select('*, batch_members(batch:batches(id,name,program,exam_year))').eq('role', 'student').order('student_code'),
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name')
    ]);
    setStudents(ss ?? []);
    setBatches(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const batchesOf = (s: any) => (s.batch_members ?? []).map((m: any) => m.batch).filter(Boolean);
  const initials = (n?: string) => (n ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' });

  // grouping
  const studentsByBatch: Record<string, any[]> = {};
  const unassigned: any[] = [];
  students.forEach((s) => {
    const bs = batchesOf(s);
    if (bs.length === 0) unassigned.push(s);
    else bs.forEach((b: any) => { (studentsByBatch[b.id] ??= []).push(s); });
  });

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? students.filter((s) => [s.full_name, s.email, s.student_code, s.phone].some((v: string) => (v ?? '').toLowerCase().includes(q)))
    : [];

  const toggle = (id: string) => setOpenFolders((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

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

  const StudentRow = ({ s }: { s: any }) => (
    <button onClick={() => openDetail(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
        {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(s.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{s.full_name || '(no name)'}</p>
        <p className="text-xs text-slate-400 truncate">{s.student_code} · {s.email}</p>
      </div>
    </button>
  );

  const Folder = ({ id, title, sub, items, accent }: { id: string; title: string; sub: string; items: any[]; accent?: string }) => {
    const isOpen = openFolders.has(id);
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ?? 'bg-blue-50 text-blue-600'}`}>
            <FolderIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-md px-2 py-0.5">{items.length}</span>
          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {items.length === 0 ? <p className="text-sm text-slate-400 p-4">No students.</p> : items.map((s) => <StudentRow key={s.id + id} s={s} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Students</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">Browse by batch, or search. Assign a student to a batch to verify them.</p>

      {/* search */}
      <div className="relative mb-5">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search any student by name, email, phone or ID…" />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : q ? (
        /* search results (flat) */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
          {searchResults.length === 0 ? <p className="text-sm text-slate-400 p-4">No students match "{search}".</p> : searchResults.map((s) => <StudentRow key={s.id} s={s} />)}
        </div>
      ) : (
        /* batch folders */
        <div className="space-y-6">
          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-amber-700">
                <AlertCircleIcon className="w-4 h-4" />
                <p className="text-xs font-bold uppercase tracking-wider">Needs a batch</p>
              </div>
              <Folder id="unassigned" title="Unassigned students" sub="Assign these to a batch to verify them" items={unassigned} accent="bg-amber-100 text-amber-600" />
            </div>
          )}

          {PROGRAMS.map((prog) => {
            const progBatches = batches.filter((b) => b.program === prog);
            if (progBatches.length === 0) return null;
            return (
              <div key={prog}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{prog} batches</p>
                <div className="space-y-3">
                  {progBatches.map((b) => (
                    <Folder
                      key={b.id}
                      id={b.id}
                      title={b.name}
                      sub={`${b.exam_year ?? ''}${b.medium ? ` · ${b.medium}` : ''}`}
                      items={studentsByBatch[b.id] ?? []}
                      accent={prog === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {batches.length === 0 && unassigned.length === 0 && (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
              <UsersIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No students yet</p>
            </div>
          )}
        </div>
      )}

      {/* detail drawer */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.full_name || 'Student'}>
        {detail && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold overflow-hidden shrink-0">
                {detail.avatar_url ? <img src={detail.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(detail.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{detail.full_name || '(no name)'}</p>
                <p className="text-xs text-slate-500">{detail.student_code} · {detail.program ?? '—'} {detail.exam_year ?? ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600"><MailIcon className="w-4 h-4 text-slate-400" /> {detail.email || '—'}</p>
              <p className="flex items-center gap-2 text-slate-600"><PhoneIcon className="w-4 h-4 text-slate-400" /> {detail.phone || '—'}</p>
              {detail.school && <p className="text-slate-600"><span className="text-slate-400">School:</span> {detail.school}</p>}
              {detail.district && <p className="text-slate-600"><span className="text-slate-400">District:</span> {detail.district}</p>}
              {detail.nic && <p className="text-slate-600"><span className="text-slate-400">NIC:</span> {detail.nic}</p>}
              {detail.guardian_phone && <p className="text-slate-600"><span className="text-slate-400">Guardian:</span> {detail.guardian_name || ''} {detail.guardian_phone}</p>}
            </div>

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
