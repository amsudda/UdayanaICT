import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  PlusIcon,
  UsersIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
  UserPlusIcon,
  LayersIcon,
  CalendarClockIcon,
  ArchiveIcon,
  UserMinusIcon,
  XIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader, Button, SearchInput, FilterTabs, StatusPill, EmptyState, Initials, Panel, Modal } from '../components/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Batch = {
  id: string;
  name: string;
  program: string;
  grade: number | null;
  exam_year: number | null;
  exam_date: string | null;
  medium: string | null;
  is_active: boolean;
  member_count?: number;
  /** average paper mark across everyone in the batch, null until marks exist */
  avg_mark?: number | null;
  marks_count?: number;
  preview?: { id: string; name: string }[];
};

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40';

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

/** Days until the exam, or null when there is no date or it has passed. */
function daysTo(date: string | null) {
  if (!date) return null;
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  return d >= 0 ? d : null;
}

const emptyForm = {
  name: '',
  program: 'A/L',
  grade: '',
  exam_year: String(new Date().getFullYear() + 1),
  exam_date: '',
  medium: 'Sinhala',
  is_active: true
};

export function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'archived'>('all');

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
  /** filters the list already in the batch — a cohort of 100 is a long scroll */
  const [memberFilter, setMemberFilter] = useState('');

  // delete
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bs }, { data: bm }, { data: mk }, { count: studentCount }] = await Promise.all([
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase.from('batch_members').select('batch_id, student:profiles(id, full_name)'),
      supabase.from('paper_marks').select('student_id, marks, max_marks'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student')
    ]);

    // which batches each student belongs to, and who is in no batch at all
    const rows = (bm ?? []) as any[];
    const byBatch = new Map<string, { id: string; name: string }[]>();
    const assigned = new Set<string>();
    rows.forEach((r) => {
      if (!r.student) return;
      assigned.add(r.student.id);
      const arr = byBatch.get(r.batch_id) ?? [];
      arr.push({ id: r.student.id, name: r.student.full_name ?? '—' });
      byBatch.set(r.batch_id, arr);
    });

    // average mark per student, then per batch
    const perStudent = new Map<string, { sum: number; n: number }>();
    (mk ?? []).forEach((m: any) => {
      const max = Number(m.max_marks ?? 100) || 100;
      const pct = (Number(m.marks ?? 0) / max) * 100;
      const a = perStudent.get(m.student_id) ?? { sum: 0, n: 0 };
      a.sum += pct;
      a.n++;
      perStudent.set(m.student_id, a);
    });

    setBatches((bs ?? []).map((b: any) => {
      const studs = byBatch.get(b.id) ?? [];
      let sum = 0;
      let n = 0;
      studs.forEach((s) => {
        const a = perStudent.get(s.id);
        if (a) { sum += a.sum; n += a.n; }
      });
      return {
        ...b,
        member_count: studs.length,
        avg_mark: n ? Math.round(sum / n) : null,
        marks_count: n,
        preview: studs.slice(0, 5)
      };
    }));

    setUnassigned(Math.max(0, (studentCount ?? 0) - assigned.size));
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
      exam_date: b.exam_date ? b.exam_date.substring(0, 10) : '',
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
      exam_date: form.exam_date ? new Date(form.exam_date).toISOString() : null,
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
    setMemberFilter('');
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

  /* ---- derived ---- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return batches.filter((b) => {
      if (tab === 'active' && !b.is_active) return false;
      if (tab === 'archived' && b.is_active) return false;
      if (!q) return true;
      return [b.name, b.program, b.medium, b.exam_year].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [batches, query, tab]);

  const shownMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.student?.full_name, m.student?.student_code, m.student?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q));
  }, [members, memberFilter]);

  const totalStudents = batches.reduce((s, b) => s + (b.member_count ?? 0), 0);
  const activeCount = batches.filter((b) => b.is_active).length;

  return (
    <div>
      <PageHeader
        eyebrow="Academic"
        title="Batches"
        description="Cohorts your students belong to. A batch decides who sees which pack, paper and notice."
        actions={<Button icon={PlusIcon} onClick={openCreate}>New batch</Button>}
      />

      {/* ── The shape of the school, in four numbers ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Batches', value: batches.length, sub: `${activeCount} active`, icon: LayersIcon, tint: 'bg-violet-50 text-violet-600' },
          { label: 'Enrolled', value: totalStudents, sub: 'memberships', icon: UsersIcon, tint: 'bg-blue-50 text-blue-600' },
          {
            label: 'In no batch',
            value: unassigned,
            sub: unassigned ? 'see nothing yet' : 'everyone placed',
            icon: UserMinusIcon,
            tint: unassigned ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          },
          {
            label: 'Archived',
            value: batches.length - activeCount,
            sub: 'not taking students',
            icon: ArchiveIcon,
            tint: 'bg-slate-100 text-slate-500'
          }
        ].map((s, i) => (
          <div key={s.label} className="rise-in rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3" style={{ animationDelay: `${i * 40}ms` }}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[22px] font-bold text-slate-900 leading-none tabular-nums">{s.value}</p>
              <p className="text-[12px] text-slate-500 mt-1 truncate">
                <span className="font-semibold text-slate-600">{s.label}</span> · {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search batches by name, year or medium" className="sm:max-w-sm w-full" />
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: `All (${batches.length})` },
            { value: 'active', label: `Active (${activeCount})` },
            { value: 'archived', label: `Archived (${batches.length - activeCount})` }
          ]}
        />
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={LayersIcon}
            title={batches.length === 0 ? 'No batches yet' : 'Nothing matches that'}
            description={
              batches.length === 0
                ? 'A batch is how content reaches students — create your first cohort, then assign students to it.'
                : 'Try a different search, or switch the filter above.'
            }
            action={batches.length === 0 ? <Button icon={PlusIcon} onClick={openCreate}>Create a batch</Button> : undefined}
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((b, i) => {
            const left = daysTo(b.exam_date);
            const avg = b.avg_mark;
            return (
              <article
                key={b.id}
                className="rise-in group relative rounded-2xl border border-slate-200 bg-white p-5 flex flex-col hover:border-slate-300 transition-colors"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* head */}
                <div className="flex items-start justify-between gap-3">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[13px] shrink-0 ${
                    b.is_active ? 'bg-[#c20f24]/10 text-[#c20f24]' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {b.program}
                  </span>
                  {b.is_active
                    ? <StatusPill tone="green">Active</StatusPill>
                    : <StatusPill tone="slate">Archived</StatusPill>}
                </div>

                <h3 className="font-bold text-slate-900 text-[17px] leading-snug mt-3 truncate" title={b.name}>{b.name}</h3>
                <p className="text-[12px] text-slate-500 mt-1">
                  {[b.exam_year ? `Exam ${b.exam_year}` : null, b.medium, b.grade ? `Grade ${b.grade}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'No details set'}
                </p>

                {/* exam countdown, only while it is ahead */}
                {left !== null && (
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#c20f24] mt-2">
                    <CalendarClockIcon className="w-3.5 h-3.5" />
                    {left} day{left === 1 ? '' : 's'} to the exam
                  </p>
                )}

                {/* students + average */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students</p>
                    <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none mt-1">{b.member_count}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg. marks</p>
                    <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none mt-1">
                      {avg === null || avg === undefined ? <span className="text-slate-300">—</span> : `${avg}%`}
                    </p>
                  </div>
                </div>

                {avg !== null && avg !== undefined && (
                  <div className="mt-2.5">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#c20f24] transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(2, avg))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{b.marks_count} mark{b.marks_count === 1 ? '' : 's'} recorded</p>
                  </div>
                )}

                {/* who is in it */}
                {b.preview && b.preview.length > 0 && (
                  <button
                    onClick={() => openMembers(b)}
                    className="flex items-center gap-2 mt-4 mb-5"
                    title="Manage members"
                  >
                    <span className="flex -space-x-2">
                      {b.preview.map((s) => (
                        <span key={s.id} className="ring-2 ring-white rounded-full">
                          <Initials name={s.name} size={28} />
                        </span>
                      ))}
                    </span>
                    {(b.member_count ?? 0) > b.preview.length && (
                      <span className="text-[12px] font-semibold text-slate-500">
                        +{(b.member_count ?? 0) - b.preview.length}
                      </span>
                    )}
                  </button>
                )}

                {/* actions */}
                <div className="flex items-center gap-1 mt-auto pt-4 border-t border-slate-100">
                  <button
                    onClick={() => openMembers(b)}
                    className="flex-1 h-9 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] duration-150"
                  >
                    <UsersIcon className="w-4 h-4" /> Members
                  </button>
                  <button
                    onClick={() => exportBatch(b)}
                    title="Download student data (CSV)"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors active:scale-95 duration-150"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    title="Edit batch"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors active:scale-95 duration-150"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    title="Delete batch"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors active:scale-95 duration-150"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* create / edit drawer */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit batch' : 'New batch'}
        description={editing ? editing.name : 'A cohort students are assigned to.'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.98] duration-150">Cancel</button>
            <button onClick={saveBatch} disabled={saving || !form.name.trim()} className="flex-1 h-11 rounded-xl bg-[#c20f24] text-white font-semibold hover:bg-[#a60d1f] disabled:opacity-50 transition-colors active:scale-[0.98] duration-150">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create batch'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Batch name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. A/L 2026 (Sinhala)" />
            <p className="text-[11px] text-slate-400 mt-1.5">Students see this name on their dashboard.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Program</label>
              <select className={inputCls} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
                <option value="A/L">A/L</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam year</label>
              <input type="number" className={inputCls} value={form.exam_year} onChange={(e) => setForm({ ...form, exam_year: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam date</label>
              <input type="date" className={inputCls} value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
              <p className="text-[11px] text-slate-400 mt-1.5">Drives the students' countdown.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade (optional)</label>
              <input type="number" className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="13" />
            </div>
          </div>
          <label className="flex items-start gap-3 pt-1 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 mt-0.5 rounded accent-[#c20f24]" />
            <span className="text-sm text-slate-700">
              Active
              <span className="block text-[12px] text-slate-400">An archived batch keeps its students and history but stops taking new ones.</span>
            </span>
          </label>
        </div>
      </Modal>

      {/* members drawer */}
      <Modal
        open={!!membersBatch}
        onClose={() => setMembersBatch(null)}
        size="lg"
        title={membersBatch ? membersBatch.name : ''}
        description={membersBatch ? `${members.length} student${members.length === 1 ? '' : 's'} in this batch` : undefined}
        footer={
          membersBatch ? (
            <div className="flex gap-3">
              <button
                onClick={() => exportBatch(membersBatch)}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.98] duration-150"
              >
                <DownloadIcon className="w-4 h-4" /> Download student data (CSV)
              </button>
              <button
                onClick={() => setMembersBatch(null)}
                className="h-11 px-6 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors active:scale-[0.98] duration-150"
              >
                Done
              </button>
            </div>
          ) : null
        }
      >
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Add a student</label>
          <SearchInput value={search} onChange={runSearch} placeholder="Search by name, email or student ID…" />
          {search.trim().length === 1 && <p className="text-[11px] text-slate-400 mt-1.5">Keep typing — two letters or more.</p>}
          {search.trim().length >= 2 && results.length === 0 && (
            <p className="text-[12px] text-slate-400 mt-2">No student matches, or they are already in this batch.</p>
          )}
          {results.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {results.map((s) => (
                <button key={s.id} onClick={() => addMember(s.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                  <Initials name={s.full_name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 truncate">{s.full_name || '(no name)'}</span>
                    <span className="block text-xs text-slate-400 truncate">{[s.student_code, s.email].filter(Boolean).join(' · ')}</span>
                  </span>
                  <UserPlusIcon className="w-4 h-4 text-[#c20f24] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {shownMembers.length === members.length
              ? `${members.length} student${members.length === 1 ? '' : 's'}`
              : `${shownMembers.length} of ${members.length}`}
          </p>
        </div>

        {members.length > 8 && (
          <input
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            placeholder="Filter this list…"
            className="w-full h-10 rounded-xl border border-slate-200 px-3.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40"
          />
        )}

        {members.length === 0 ? (
          <EmptyState icon={UsersIcon} title="Nobody here yet" description="Search above to add your first student to this batch." />
        ) : shownMembers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nobody in this batch matches that.</p>
        ) : (
          <div className="space-y-2">
            {shownMembers.map((m) => (
              <div key={m.id} className="group flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors">
                <Initials name={m.student?.full_name} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.student?.full_name || '(no name)'}</p>
                  <p className="text-xs text-slate-400 truncate">{[m.student?.student_code, m.student?.email].filter(Boolean).join(' · ')}</p>
                </div>
                <button
                  onClick={() => removeMember(m.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors active:scale-95 duration-150"
                  aria-label={`Remove ${m.student?.full_name ?? 'student'} from this batch`}
                  title="Remove from batch"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* delete confirm with export */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message={
          <>
            This removes the batch and its {deleteTarget?.member_count ?? 0} membership
            {deleteTarget?.member_count === 1 ? '' : 's'}. <strong>Student accounts are kept</strong>, but those students
            lose access to anything aimed at this batch.
          </>
        }
        extra={
          deleteTarget ? (
            <button
              onClick={() => exportBatch(deleteTarget)}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <DownloadIcon className="w-4 h-4" /> Download student data first (CSV)
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
