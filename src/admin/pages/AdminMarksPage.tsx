import { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  PlusIcon, Trash2Icon, PencilIcon, ChevronDownIcon, CheckIcon, XIcon,
  Loader2Icon, TrendingUpIcon, UsersIcon, SearchIcon, FileTextIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MarksChart, type Mark } from '../../components/shared/MarksChart';
import { PageHeader, Initials, EmptyState, Panel } from '../components/ui';
import { AreaSpark } from '../components/charts';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Paper marks.
 *
 * Built as one page you stay on: a batch is a segmented control, a student
 * is a row, and a row opens *in place* to show the chart, the marks and the
 * form that adds the next one. Nothing slides in from the side, nothing
 * covers the page — the teacher's position in the list is never lost, which
 * matters when entering thirty marks one after another.
 *
 * The motion is Apple's: springs rather than durations, so an expansion
 * that is interrupted carries its velocity into the reverse instead of
 * restarting; 0.98 on press; and no movement at all under reduced motion.
 */

const SPRING = { type: 'spring' as const, duration: 0.45, bounce: 0.18 };

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40 transition-shadow';

const now = new Date();
const pad = (x: number) => String(x).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const emptyForm = { id: '', title: '', paper_no: '', type: 'full', marks: '', max_marks: '100', exam_date: today };

const pctOf = (m: Mark) => (m.max_marks ? Math.round((Number(m.marks) / Number(m.max_marks)) * 100) : 0);

const toneFor = (p: number) =>
  p >= 75 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-600';

export function AdminMarksPage() {
  const reduce = useReducedMotion();

  const [batches, setBatches] = useState<any[]>([]);
  const [studentsByBatch, setStudentsByBatch] = useState<Record<string, any[]>>({});
  const [allMarks, setAllMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [batchId, setBatchId] = useState<string>('');
  const [query, setQuery] = useState('');

  // the one open student
  const [openId, setOpenId] = useState<string | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bs }, { data: bm }, { data: mk }] = await Promise.all([
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase.from('batch_members').select('batch_id, student:profiles(id, full_name, student_code, email, avatar_url)'),
      supabase.from('paper_marks').select('student_id, marks, max_marks, exam_date')
    ]);
    const grouped: Record<string, any[]> = {};
    (bm ?? []).forEach((r: any) => { if (r.student) (grouped[r.batch_id] ??= []).push(r.student); });
    setBatches(bs ?? []);
    setStudentsByBatch(grouped);
    setAllMarks(mk ?? []);
    if (!batchId && (bs ?? []).length) setBatchId(bs![0].id);
    setLoading(false);
  }, [batchId]);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /** Every student's average and series, so a row says something before it opens. */
  const summaryOf = useMemo(() => {
    const map = new Map<string, { avg: number; n: number; series: number[] }>();
    const byStudent = new Map<string, any[]>();
    allMarks.forEach((m) => {
      if (!m.max_marks) return;
      const arr = byStudent.get(m.student_id) ?? [];
      arr.push(m);
      byStudent.set(m.student_id, arr);
    });
    byStudent.forEach((rows, id) => {
      const sorted = [...rows].sort((a, b) => String(a.exam_date ?? '').localeCompare(String(b.exam_date ?? '')));
      const series = sorted.map((m) => Math.round((Number(m.marks) / Number(m.max_marks)) * 100));
      map.set(id, { avg: Math.round(series.reduce((s, v) => s + v, 0) / series.length), n: series.length, series });
    });
    return map;
  }, [allMarks]);

  const loadMarks = useCallback(async (studentId: string) => {
    setMarksLoading(true);
    const { data } = await supabase
      .from('paper_marks')
      .select('*')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: true });
    setMarks((data ?? []) as Mark[]);
    setMarksLoading(false);
  }, []);

  const toggleStudent = async (s: any) => {
    if (openId === s.id) { setOpenId(null); return; }
    setOpenId(s.id);
    setForm(emptyForm);
    setConfirmDelete(null);
    setMarks([]);
    await loadMarks(s.id);
  };

  const refreshTotals = async () => {
    const { data } = await supabase.from('paper_marks').select('student_id, marks, max_marks, exam_date');
    setAllMarks(data ?? []);
  };

  const saveMark = async (studentId: string) => {
    if (!form.title.trim() || form.marks === '') return;
    setSaving(true);
    const payload = {
      student_id: studentId,
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
    await loadMarks(studentId);
    refreshTotals();
  };

  const editMark = (m: Mark) => setForm({
    id: m.id,
    title: m.title,
    paper_no: m.paper_no != null ? String(m.paper_no) : '',
    type: m.type,
    marks: String(m.marks),
    max_marks: String(m.max_marks),
    exam_date: m.exam_date ?? today
  });

  const deleteMark = async (id: string, studentId: string) => {
    await supabase.from('paper_marks').delete().eq('id', id);
    setConfirmDelete(null);
    await loadMarks(studentId);
    refreshTotals();
  };

  /* ── the list ── */
  const students = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? Object.values(studentsByBatch).flat().filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
      : (studentsByBatch[batchId] ?? []);
    const rows = q
      ? base.filter((s) => [s.full_name, s.student_code, s.email].some((v: string) => (v ?? '').toLowerCase().includes(q)))
      : base;
    return [...rows].sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  }, [studentsByBatch, batchId, query]);

  const batchStats = useMemo(() => {
    const ids = new Set((studentsByBatch[batchId] ?? []).map((s) => s.id));
    let sum = 0, n = 0, withMarks = 0;
    ids.forEach((id) => {
      const s = summaryOf.get(id);
      if (s) { sum += s.avg; n++; withMarks++; }
    });
    return { avg: n ? Math.round(sum / n) : null, students: ids.size, withMarks };
  }, [studentsByBatch, batchId, summaryOf]);

  const activeBatch = batches.find((b) => b.id === batchId);

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Academic"
        title="Paper Marks"
        description="Pick a batch, open a student, enter the mark. You never leave this page."
      />

      {/* ── Batch segmented control, with the pill sliding between them ── */}
      {batches.length > 0 && (
        <div className="rise-in flex gap-1 p-1 bg-slate-100 rounded-2xl mb-4 overflow-x-auto">
          {batches.map((b) => {
            const on = b.id === batchId && !query;
            return (
              <button
                key={b.id}
                onClick={() => { setBatchId(b.id); setQuery(''); setOpenId(null); }}
                className="relative flex-1 min-w-[140px] h-10 rounded-xl text-[13px] font-semibold whitespace-nowrap px-4 transition-colors active:scale-[0.98] duration-150"
              >
                {on && (
                  <motion.span
                    layoutId="marks-batch-pill"
                    transition={reduce ? { duration: 0 } : SPRING}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                  />
                )}
                <span className={`relative z-10 ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                  {b.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search + batch summary ── */}
      <div className="rise-in flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpenId(null); }}
            placeholder="Find any student…"
            className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40"
          />
        </div>

        {!query && activeBatch && (
          <div className="flex items-center gap-5 text-[13px]">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <UsersIcon className="w-4 h-4 text-slate-400" />
              <strong className="text-slate-900 font-bold tabular-nums">{batchStats.students}</strong> students
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <TrendingUpIcon className="w-4 h-4 text-slate-400" />
              {batchStats.avg === null
                ? 'no marks yet'
                : <><strong className="text-slate-900 font-bold tabular-nums">{batchStats.avg}%</strong> batch average</>}
            </span>
          </div>
        )}
      </div>

      {/* ── Students, as an inset list that opens in place ── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[72px] m-3 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : students.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={UsersIcon}
            title={query ? 'Nobody matches that' : 'No students in this batch'}
            description={query ? 'Try a different name or student ID.' : 'Add students to the batch first, then enter their marks here.'}
          />
        </Panel>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {students.map((s, i) => {
            const sum = summaryOf.get(s.id);
            const isOpen = openId === s.id;
            return (
              <div key={s.id} className={`${i > 0 ? 'border-t border-slate-100' : ''}`}>
                {/* row */}
                <button
                  onClick={() => toggleStudent(s)}
                  className={`rise-in w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 text-left transition-colors active:scale-[0.995] duration-150 ${
                    isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                  }`}
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                >
                  <Initials name={s.full_name} src={s.avatar_url} size={40} />

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.full_name || '(no name)'}</p>
                    <p className="text-[12px] text-slate-400 truncate">{[s.student_code, s.email].filter(Boolean).join(' · ')}</p>
                  </div>

                  {sum ? (
                    <div className="hidden sm:block w-24 shrink-0 opacity-80">
                      <AreaSpark points={sum.series} color="#c20f24" height={32} />
                    </div>
                  ) : null}

                  <div className="text-right shrink-0 w-24">
                    {sum ? (
                      <>
                        <p className={`text-[17px] font-bold tabular-nums leading-none ${toneFor(sum.avg)}`}>{sum.avg}%</p>
                        <p className="text-[11px] text-slate-400 mt-1">{sum.n} paper{sum.n === 1 ? '' : 's'}</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-slate-300 font-medium">No marks</p>
                    )}
                  </div>

                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={reduce ? { duration: 0 } : SPRING}
                    className="text-slate-300 shrink-0"
                  >
                    <ChevronDownIcon className="w-5 h-5" />
                  </motion.span>
                </button>

                {/* the student's sheet, opened in place */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="sheet"
                      initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={reduce ? { duration: 0.15 } : SPRING}
                      className="overflow-hidden bg-slate-50/60"
                    >
                      <div className="px-4 sm:px-5 py-5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
                        {/* left: chart + marks */}
                        <div className="min-w-0">
                          {marksLoading ? (
                            <div className="h-44 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                              <Loader2Icon className="w-5 h-5 text-slate-300 animate-spin" />
                            </div>
                          ) : marks.length === 0 ? (
                            <div className="rounded-2xl bg-white border border-slate-200 py-10 text-center">
                              <FileTextIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                              <p className="text-sm font-semibold text-slate-700">No marks yet</p>
                              <p className="text-[13px] text-slate-400 mt-1">Add the first one on the right.</p>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                <MarksChart marks={marks} />
                              </div>

                              <div className="mt-3 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                                {[...marks].reverse().map((m, mi) => {
                                  const p = pctOf(m);
                                  const confirming = confirmDelete === m.id;
                                  return (
                                    <motion.div
                                      key={m.id}
                                      initial={reduce ? false : { opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={reduce ? { duration: 0 } : { ...SPRING, delay: Math.min(mi, 8) * 0.03 }}
                                      className={`flex items-center gap-3 px-4 py-3 ${mi > 0 ? 'border-t border-slate-100' : ''}`}
                                    >
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${
                                        m.type === 'full' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                      }`}>
                                        {m.type === 'full' ? 'FULL' : 'TIMING'}
                                      </span>

                                      <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-900 truncate">
                                          {m.title}{m.paper_no != null ? ` · #${m.paper_no}` : ''}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                          {m.exam_date ? new Date(m.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'no date'}
                                        </p>
                                      </div>

                                      <p className="text-[13px] font-bold text-slate-900 tabular-nums shrink-0">
                                        {m.marks}<span className="text-slate-400 font-medium">/{m.max_marks}</span>
                                        <span className={`ml-2 ${toneFor(p)}`}>{p}%</span>
                                      </p>

                                      {/* delete confirms in place — no dialog over the page */}
                                      {confirming ? (
                                        <span className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => deleteMark(m.id, s.id)}
                                            className="h-8 px-2.5 rounded-lg bg-red-600 text-white text-[12px] font-bold hover:bg-red-700 transition-colors active:scale-95 duration-150"
                                          >
                                            Delete
                                          </button>
                                          <button
                                            onClick={() => setConfirmDelete(null)}
                                            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors"
                                          >
                                            <XIcon className="w-4 h-4" />
                                          </button>
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => editMark(m)}
                                            title="Edit this mark"
                                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
                                          >
                                            <PencilIcon className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => setConfirmDelete(m.id)}
                                            title="Delete this mark"
                                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95 duration-150"
                                          >
                                            <Trash2Icon className="w-4 h-4" />
                                          </button>
                                        </span>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {/* right: the entry form, always in reach */}
                        <div className="rounded-2xl bg-white border border-slate-200 p-4 h-fit lg:sticky lg:top-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-slate-900 text-[15px]">{form.id ? 'Edit mark' : 'Add a mark'}</p>
                            {form.id && (
                              <button
                                onClick={() => setForm(emptyForm)}
                                className="text-[12px] font-semibold text-slate-400 hover:text-slate-900 transition-colors"
                              >
                                New instead
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <input
                              className={inputCls}
                              value={form.title}
                              onChange={(e) => setForm({ ...form, title: e.target.value })}
                              placeholder="Paper title, e.g. Week Paper 05"
                            />

                            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                              {(['full', 'timing'] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setForm({ ...form, type: t })}
                                  className="relative flex-1 h-9 rounded-lg text-[13px] font-semibold transition-colors active:scale-[0.98] duration-150"
                                >
                                  {form.type === t && (
                                    <motion.span
                                      layoutId={`type-pill-${s.id}`}
                                      transition={reduce ? { duration: 0 } : SPRING}
                                      className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                    />
                                  )}
                                  <span className={`relative z-10 ${form.type === t ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {t === 'full' ? 'Full paper' : 'Timing'}
                                  </span>
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Marks</label>
                                <input
                                  type="number"
                                  className={inputCls}
                                  value={form.marks}
                                  onChange={(e) => setForm({ ...form, marks: e.target.value })}
                                  placeholder="55"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Out of</label>
                                <input
                                  type="number"
                                  className={inputCls}
                                  value={form.max_marks}
                                  onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
                                  placeholder="100"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Paper no.</label>
                                <input
                                  type="number"
                                  className={inputCls}
                                  value={form.paper_no}
                                  onChange={(e) => setForm({ ...form, paper_no: e.target.value })}
                                  placeholder="73"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
                                <input
                                  type="date"
                                  className={inputCls}
                                  value={form.exam_date}
                                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* the result of what has been typed, before it is saved */}
                            <AnimatePresence initial={false}>
                              {form.marks !== '' && Number(form.max_marks) > 0 && (
                                <motion.p
                                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                  animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                                  transition={reduce ? { duration: 0.12 } : SPRING}
                                  className="text-[13px] text-slate-500 overflow-hidden"
                                >
                                  That is{' '}
                                  <strong className={toneFor(Math.round((Number(form.marks) / Number(form.max_marks)) * 100))}>
                                    {Math.round((Number(form.marks) / Number(form.max_marks)) * 100)}%
                                  </strong>
                                </motion.p>
                              )}
                            </AnimatePresence>

                            <button
                              onClick={() => saveMark(s.id)}
                              disabled={saving || !form.title.trim() || form.marks === ''}
                              className="w-full h-11 rounded-xl bg-[#c20f24] text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[#a60d1f] disabled:opacity-40 transition-colors active:scale-[0.98] duration-150"
                            >
                              {saving
                                ? <Loader2Icon className="w-4 h-4 animate-spin" />
                                : form.id ? <CheckIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                              {form.id ? 'Save changes' : 'Add mark'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
