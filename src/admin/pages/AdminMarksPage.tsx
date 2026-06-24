import { useEffect, useState, useCallback } from 'react';
import {
  SearchIcon, PlusIcon, Trash2Icon, PencilIcon, ArrowLeftIcon,
  TrendingUpIcon, LayersIcon, ChevronRightIcon, GraduationCapIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MarksChart, type Mark } from '../../components/shared/MarksChart';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';
const now = new Date();
const pad = (x: number) => String(x).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const emptyForm = { id: '', title: '', paper_no: '', type: 'full', marks: '', max_marks: '100', exam_date: today };
const PROGRAMS = ['A/L', 'O/L'];

export function AdminMarksPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [studentsByBatch, setStudentsByBatch] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // drill-down
  const [program, setProgram] = useState<string | null>(null);
  const [batch, setBatch] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);

  // search shortcut
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // marks editor
  const [marks, setMarks] = useState<Mark[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bs }, { data: bm }] = await Promise.all([
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase.from('batch_members').select('batch_id, student:profiles(id, full_name, student_code, email, avatar_url)')
    ]);
    const grouped: Record<string, any[]> = {};
    (bm ?? []).forEach((r: any) => { if (r.student) (grouped[r.batch_id] ??= []).push(r.student); });
    setBatches(bs ?? []);
    setStudentsByBatch(grouped);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadMarks = useCallback(async (studentId: string) => {
    const { data } = await supabase.from('paper_marks').select('*').eq('student_id', studentId).order('exam_date', { ascending: true });
    setMarks((data ?? []) as Mark[]);
  }, []);

  const pickStudent = async (s: any) => { setStudent(s); setForm(emptyForm); setQuery(''); setResults([]); await loadMarks(s.id); };

  const search = async (qv: string) => {
    setQuery(qv);
    if (qv.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, student_code, email, avatar_url').eq('role', 'student')
      .or(`full_name.ilike.%${qv}%,email.ilike.%${qv}%,student_code.ilike.%${qv}%`).limit(8);
    setResults(data ?? []);
  };

  const saveMark = async () => {
    if (!student || !form.title.trim() || form.marks === '') return;
    setSaving(true);
    const payload = {
      student_id: student.id, title: form.title.trim(), paper_no: form.paper_no ? Number(form.paper_no) : null,
      type: form.type, marks: Number(form.marks), max_marks: form.max_marks ? Number(form.max_marks) : 100, exam_date: form.exam_date || null
    };
    if (form.id) await supabase.from('paper_marks').update(payload).eq('id', form.id);
    else await supabase.from('paper_marks').insert(payload);
    setSaving(false);
    setForm(emptyForm);
    loadMarks(student.id);
  };
  const editMark = (m: Mark) => setForm({ id: m.id, title: m.title, paper_no: m.paper_no != null ? String(m.paper_no) : '', type: m.type, marks: String(m.marks), max_marks: String(m.max_marks), exam_date: m.exam_date ?? today });
  const deleteMark = async (id: string) => { await supabase.from('paper_marks').delete().eq('id', id); if (student) loadMarks(student.id); };
  const pct = (m: Mark) => (m.max_marks ? Math.round((Number(m.marks) / Number(m.max_marks)) * 100) : 0);
  const initials = (n?: string) => (n ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // breadcrumb
  const Crumb = () => (
    <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
      <button onClick={() => { setProgram(null); setBatch(null); setStudent(null); }} className="font-medium text-slate-500 hover:text-blue-600">All</button>
      {program && <><ChevronRightIcon className="w-4 h-4 text-slate-300" /><button onClick={() => { setBatch(null); setStudent(null); }} className="font-medium text-slate-500 hover:text-blue-600">{program}</button></>}
      {batch && <><ChevronRightIcon className="w-4 h-4 text-slate-300" /><button onClick={() => setStudent(null)} className="font-medium text-slate-500 hover:text-blue-600">{batch.name}</button></>}
      {student && <><ChevronRightIcon className="w-4 h-4 text-slate-300" /><span className="font-semibold text-slate-900">{student.full_name}</span></>}
    </div>
  );

  const StudentRow = ({ s }: { s: any }) => (
    <button onClick={() => pickStudent(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
        {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(s.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{s.full_name || '(no name)'}</p>
        <p className="text-xs text-slate-400 truncate">{s.student_code} · {s.email}</p>
      </div>
      <ChevronRightIcon className="w-4 h-4 text-slate-300" />
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Paper marks</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">Pick a program → batch → student, then add their marks. Or search a student directly.</p>

      {/* search shortcut (hidden once a student is open) */}
      {!student && (
        <div className="relative mb-5 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className={`${inputCls} h-11 pl-9`} value={query} onChange={(e) => search(e.target.value)} placeholder="Or search a student directly…" />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden">
              {results.map((s) => <StudentRow key={s.id} s={s} />)}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : student ? (
        /* ── marks editor ── */
        <div>
          <button onClick={() => setStudent(null)} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 mb-4">
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>
          <Crumb />

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2"><TrendingUpIcon className="w-4 h-4 text-blue-600" /><h2 className="font-bold text-slate-900">Growth preview</h2></div>
              <MarksChart marks={marks} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
              <p className="font-semibold text-slate-900 mb-3">{form.id ? 'Edit mark' : 'Add a mark'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Test name</label>
                  <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week Paper 05 / March Month Test / Past Paper 2023" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Paper no</label>
                  <input type="number" className={inputCls} value={form.paper_no} onChange={(e) => setForm({ ...form, paper_no: e.target.value })} placeholder="73" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="full">Full Paper</option>
                    <option value="timing">Timing Paper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Marks</label>
                  <input type="number" className={inputCls} value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} placeholder="55" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Out of</label>
                  <input type="number" className={inputCls} value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} placeholder="100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                  <input type="date" className={inputCls} value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {form.id && <button onClick={() => setForm(emptyForm)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>}
                <button onClick={saveMark} disabled={saving || !form.title.trim() || form.marks === ''} className="h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" /> {form.id ? 'Update mark' : 'Add mark'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
              <p className="font-semibold text-slate-900 mb-3">{marks.length} mark{marks.length === 1 ? '' : 's'}</p>
              {marks.length === 0 ? <p className="text-sm text-slate-400">No marks added yet.</p> : (
                <div className="space-y-2">
                  {[...marks].reverse().map((m) => (
                    <div key={m.id} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.type === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{m.type === 'full' ? 'Full' : 'Timing'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.title}{m.paper_no ? ` · No ${m.paper_no}` : ''}</p>
                        <p className="text-xs text-slate-400">{m.exam_date ?? '—'}</p>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{m.marks}/{m.max_marks} <span className="text-slate-400 font-medium">({pct(m)}%)</span></span>
                      <button onClick={() => editMark(m)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => deleteMark(m.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : batch ? (
        /* ── students of batch ── */
        <div>
          <Crumb />
          {(studentsByBatch[batch.id] ?? []).length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300 bg-white">
              <p className="text-sm text-slate-400">No students in this batch yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {(studentsByBatch[batch.id] ?? []).map((s) => <StudentRow key={s.id} s={s} />)}
            </div>
          )}
        </div>
      ) : program ? (
        /* ── batches of program ── */
        <div>
          <Crumb />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {batches.filter((b) => b.program === program).map((b) => (
              <button key={b.id} onClick={() => setBatch(b)} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-blue-400 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${program === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}><LayersIcon className="w-5 h-5" /></div>
                <p className="font-bold text-slate-900 truncate">{b.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{(studentsByBatch[b.id] ?? []).length} students</p>
              </button>
            ))}
            {batches.filter((b) => b.program === program).length === 0 && <p className="text-sm text-slate-400 col-span-full">No {program} batches yet.</p>}
          </div>
        </div>
      ) : (
        /* ── programs ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROGRAMS.map((prog) => {
            const count = batches.filter((b) => b.program === prog).length;
            return (
              <button key={prog} onClick={() => setProgram(prog)} className={`rounded-3xl p-6 text-left text-white transition-transform active:scale-[0.98] ${prog === 'A/L' ? 'bg-[linear-gradient(135deg,#0070ff,#4f46e5)]' : 'bg-[linear-gradient(135deg,#10b981,#059669)]'}`}>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><GraduationCapIcon className="w-6 h-6" /></div>
                <p className="text-2xl font-black">{prog}</p>
                <p className="text-sm text-white/80 mt-1">{count} batch{count === 1 ? '' : 'es'} · tap to open</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
