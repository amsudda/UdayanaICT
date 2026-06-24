import { useState, useCallback } from 'react';
import { SearchIcon, PlusIcon, Trash2Icon, PencilIcon, XIcon, TrendingUpIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MarksChart, type Mark } from '../../components/shared/MarksChart';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';
const now = new Date();
const pad = (x: number) => String(x).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const emptyForm = { id: '', title: '', paper_no: '', type: 'full', marks: '', max_marks: '100', exam_date: today };

export function AdminMarksPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [student, setStudent] = useState<any | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const search = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, student_code, email')
      .eq('role', 'student')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,student_code.ilike.%${q}%`)
      .limit(8);
    setResults(data ?? []);
  };

  const loadMarks = useCallback(async (studentId: string) => {
    const { data } = await supabase.from('paper_marks').select('*').eq('student_id', studentId).order('exam_date', { ascending: true });
    setMarks((data ?? []) as Mark[]);
  }, []);

  const selectStudent = async (s: any) => {
    setStudent(s);
    setResults([]);
    setQuery('');
    setForm(emptyForm);
    await loadMarks(s.id);
  };

  const saveMark = async () => {
    if (!student || !form.title.trim() || form.marks === '') return;
    setSaving(true);
    const payload = {
      student_id: student.id,
      title: form.title.trim(),
      paper_no: form.paper_no ? Number(form.paper_no) : null,
      type: form.type,
      marks: Number(form.marks),
      max_marks: form.max_marks ? Number(form.max_marks) : 100,
      exam_date: form.exam_date || null
    };
    if (form.id) await supabase.from('paper_marks').update(payload).eq('id', form.id);
    else await supabase.from('paper_marks').insert(payload);
    setSaving(false);
    setForm(emptyForm);
    loadMarks(student.id);
  };

  const editMark = (m: Mark) =>
    setForm({
      id: m.id, title: m.title, paper_no: m.paper_no != null ? String(m.paper_no) : '',
      type: m.type, marks: String(m.marks), max_marks: String(m.max_marks), exam_date: m.exam_date ?? today
    });

  const deleteMark = async (id: string) => {
    await supabase.from('paper_marks').delete().eq('id', id);
    if (student) loadMarks(student.id);
  };

  const pct = (m: Mark) => (m.max_marks ? Math.round((Number(m.marks) / Number(m.max_marks)) * 100) : 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Paper marks</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Pick a student, then add their paper marks one by one. They'll see their growth graph.</p>

      {/* student picker */}
      {!student ? (
        <div className="max-w-md">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className={`${inputCls} h-11 pl-9`} value={query} onChange={(e) => search(e.target.value)} placeholder="Search student by name, email or ID…" />
          </div>
          {results.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {results.map((s) => (
                <button key={s.id} onClick={() => selectStudent(s)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50">
                  <span className="block text-sm font-medium text-slate-900">{s.full_name || '(no name)'}</span>
                  <span className="block text-xs text-slate-400">{s.student_code} · {s.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* selected student header */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4">
            <div>
              <p className="font-semibold text-slate-900">{student.full_name || '(no name)'}</p>
              <p className="text-xs text-slate-400">{student.student_code} · {student.email}</p>
            </div>
            <button onClick={() => { setStudent(null); setMarks([]); }} className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
              <XIcon className="w-4 h-4" /> Change
            </button>
          </div>

          {/* growth preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-900">Growth preview</h2>
            </div>
            <MarksChart marks={marks} />
          </div>

          {/* add / edit form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <p className="font-semibold text-slate-900 mb-3">{form.id ? 'Edit mark' : 'Add a mark'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Paper title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week Paper 05" />
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

          {/* marks list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <p className="font-semibold text-slate-900 mb-3">{marks.length} mark{marks.length === 1 ? '' : 's'}</p>
            {marks.length === 0 ? (
              <p className="text-sm text-slate-400">No marks added yet.</p>
            ) : (
              <div className="space-y-2">
                {[...marks].reverse().map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.type === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.type === 'full' ? 'Full' : 'Timing'}
                    </span>
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
      )}
    </div>
  );
}
