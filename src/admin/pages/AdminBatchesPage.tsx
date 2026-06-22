import { useEffect, useState, useCallback } from 'react';
import {
  PlusIcon,
  UsersIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
  SearchIcon,
  UserPlusIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Batch = {
  id: string;
  name: string;
  program: string;
  grade: number | null;
  exam_year: number | null;
  medium: string | null;
  is_active: boolean;
  member_count?: number;
};

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyForm = {
  name: '',
  program: 'A/L',
  grade: '',
  exam_year: String(new Date().getFullYear() + 1),
  medium: 'Sinhala',
  is_active: true
};

export function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // create/edit drawer
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // members drawer
  const [membersBatch, setMembersBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // delete
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: bs } = await supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name');
    const { data: bm } = await supabase.from('batch_members').select('batch_id');
    const counts = (bm ?? []).reduce<Record<string, number>>((acc, r: any) => {
      acc[r.batch_id] = (acc[r.batch_id] ?? 0) + 1;
      return acc;
    }, {});
    setBatches((bs ?? []).map((b: any) => ({ ...b, member_count: counts[b.id] ?? 0 })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- create / edit ---- */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };
  const openEdit = (b: Batch) => {
    setEditing(b);
    setForm({
      name: b.name,
      program: b.program,
      grade: b.grade != null ? String(b.grade) : '',
      exam_year: b.exam_year != null ? String(b.exam_year) : '',
      medium: b.medium ?? '',
      is_active: b.is_active
    });
    setEditorOpen(true);
  };
  const saveBatch = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      program: form.program,
      grade: form.grade ? Number(form.grade) : null,
      exam_year: form.exam_year ? Number(form.exam_year) : null,
      medium: form.medium || null,
      is_active: form.is_active
    };
    if (editing) await supabase.from('batches').update(payload).eq('id', editing.id);
    else await supabase.from('batches').insert(payload);
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  /* ---- members ---- */
  const openMembers = async (b: Batch) => {
    setMembersBatch(b);
    setSearch('');
    setResults([]);
    const { data } = await supabase
      .from('batch_members')
      .select('id, student:profiles(id, full_name, student_code, email, phone)')
      .eq('batch_id', b.id);
    setMembers(data ?? []);
  };
  const runSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, student_code, email')
      .eq('role', 'student')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,student_code.ilike.%${q}%`)
      .limit(8);
    const memberIds = new Set(members.map((m) => m.student?.id));
    setResults((data ?? []).filter((s: any) => !memberIds.has(s.id)));
  };
  const addMember = async (studentId: string) => {
    if (!membersBatch) return;
    await supabase.from('batch_members').insert({ batch_id: membersBatch.id, student_id: studentId });
    await openMembers(membersBatch);
    setSearch('');
    setResults([]);
    load();
  };
  const removeMember = async (rowId: string) => {
    await supabase.from('batch_members').delete().eq('id', rowId);
    if (membersBatch) await openMembers(membersBatch);
    load();
  };

  /* ---- export + delete ---- */
  const exportBatch = async (b: Batch) => {
    const { data } = await supabase
      .from('batch_members')
      .select('student:profiles(student_code, full_name, email, phone, nic, gender, birth_date, school, district, medium, program, exam_year, guardian_name, guardian_phone, address)')
      .eq('batch_id', b.id);
    const header = ['Student ID', 'Name', 'Email', 'Phone', 'NIC', 'Gender', 'Birth date', 'School', 'District', 'Medium', 'Program', 'Exam year', 'Guardian', 'Guardian phone', 'Address'];
    const rows = (data ?? []).map((r: any) => {
      const s = r.student ?? {};
      return [s.student_code, s.full_name, s.email, s.phone, s.nic, s.gender, s.birth_date, s.school, s.district, s.medium, s.program, s.exam_year, s.guardian_name, s.guardian_phone, s.address];
    });
    downloadCsv(`${b.name.replace(/\s+/g, '_')}_students.csv`, [header, ...rows]);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('batches').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Batches</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> New batch
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Create cohorts (O/L 2027, A/L 2026…) and assign students.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <p className="font-semibold text-slate-700">No batches yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first cohort to start assigning students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => (
            <div key={b.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${b.program === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {b.program}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 truncate">{b.name}</p>
                  {!b.is_active && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Inactive</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {b.exam_year ?? '—'}{b.medium ? ` · ${b.medium}` : ''} · {b.member_count} student{b.member_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openMembers(b)} title="Members" className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <UsersIcon className="w-4 h-4" /> <span className="hidden sm:inline">Members</span>
                </button>
                <button onClick={() => openEdit(b)} title="Edit" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(b)} title="Delete" className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* create / edit drawer */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit batch' : 'New batch'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={saveBatch} disabled={saving || !form.name.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Batch name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. A/L 2026 (Sinhala)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Program</label>
              <select className={inputCls} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
                <option value="A/L">A/L</option>
                <option value="O/L">O/L</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam year</label>
              <input type="number" className={inputCls} value={form.exam_year} onChange={(e) => setForm({ ...form, exam_year: e.target.value })} placeholder="2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade (optional)</label>
              <input type="number" className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="13" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Medium</label>
              <select className={inputCls} value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}>
                <option value="Sinhala">Sinhala</option>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Active (accepting students)</span>
          </label>
        </div>
      </Drawer>

      {/* members drawer */}
      <Drawer open={!!membersBatch} onClose={() => setMembersBatch(null)} title={membersBatch ? `${membersBatch.name} — members` : ''}>
        {/* add */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Add a student</label>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className={`${inputCls} pl-9`} value={search} onChange={(e) => runSearch(e.target.value)} placeholder="Search by name, email or ID…" />
          </div>
          {results.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {results.map((s) => (
                <button key={s.id} onClick={() => addMember(s.id)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">{s.full_name || '(no name)'}</span>
                    <span className="block text-xs text-slate-400 truncate">{s.student_code} · {s.email}</span>
                  </span>
                  <UserPlusIcon className="w-4 h-4 text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* current members */}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{members.length} student{members.length === 1 ? '' : 's'}</p>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{m.student?.full_name || '(no name)'}</p>
                <p className="text-xs text-slate-400 truncate">{m.student?.student_code} · {m.student?.email}</p>
              </div>
              <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                <Trash2Icon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {members.length === 0 && <p className="text-sm text-slate-400">No students in this batch yet.</p>}
        </div>
      </Drawer>

      {/* delete confirm with export */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message={
          <>
            This removes the batch and its student memberships. <strong>Student accounts are kept.</strong> Download the
            student data first if you need a record.
          </>
        }
        extra={
          deleteTarget ? (
            <button
              onClick={() => exportBatch(deleteTarget)}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <DownloadIcon className="w-4 h-4" /> Download student data (CSV)
            </button>
          ) : null
        }
        confirmLabel="Delete batch"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
