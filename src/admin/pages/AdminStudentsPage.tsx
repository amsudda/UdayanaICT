import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, UsersIcon, AlertCircleIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, ShieldCheckIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */

const PROGRAMS = ['A/L'];

export function AdminStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

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

  // grouping
  const studentsByBatch: Record<string, any[]> = {};
  const unassigned: any[] = [];
  const needsVerification: any[] = [];
  students.forEach((s) => {
    if (s.verification_status === 'pending') needsVerification.push(s);
    const bs = batchesOf(s);
    if (bs.length === 0) unassigned.push(s);
    else bs.forEach((b: any) => { (studentsByBatch[b.id] ??= []).push(s); });
  });

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? students.filter((s) => [s.full_name, s.email, s.student_code, s.phone].some((v: string) => (v ?? '').toLowerCase().includes(q)))
    : [];

  const toggle = (id: string) => setOpenFolders((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const open = (s: any) => navigate(`/admin/students/${s.id}`);

  const StudentRow = ({ s }: { s: any }) => (
    <button onClick={() => open(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
        {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(s.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{s.full_name || '(no name)'}</p>
        <p className="text-xs text-slate-400 truncate">{s.student_code} · {s.email}</p>
      </div>
      {s.verification_status === 'pending' && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">ID pending</span>
      )}
      {s.verification_status === 'rejected' && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">ID rejected</span>
      )}
      <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
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
      <p className="text-sm text-slate-500 mt-1 mb-5">Browse by batch, or search. Open a student to manage their access and batch.</p>

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
          {needsVerification.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-rose-700">
                <ShieldCheckIcon className="w-4 h-4" />
                <p className="text-xs font-bold uppercase tracking-wider">Needs ID verification</p>
              </div>
              <Folder
                id="needs-verification"
                title="Awaiting ID verification"
                sub={`${needsVerification.length} student${needsVerification.length === 1 ? '' : 's'} uploaded an ID — review to unlock lessons`}
                items={needsVerification}
                accent="bg-rose-100 text-rose-600"
              />
            </div>
          )}

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
    </div>
  );
}
