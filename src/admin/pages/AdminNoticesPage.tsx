import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRingIcon,
  GlobeIcon,
  LayersIcon,
  Loader2Icon,
  SendIcon,
  Trash2Icon,
  UserIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Notices — announcements from the teacher to students.
 *
 * Writes to public.notifications, the same table the rank-up and
 * achievement triggers use; what separates an announcement from those is
 * `type = 'announcement'`. Audience is expressed by which of the two
 * targeting columns is filled (see migration_notices.sql):
 *
 *   everyone  -> student_id null, batch_id null
 *   a batch   -> student_id null, batch_id set
 *   a student -> student_id set
 *
 * A notice is never edited after posting: students may already have read
 * it, so a correction is a new notice and a mistake is withdrawn.
 */

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

type Audience = 'everyone' | 'batch' | 'student';

export function AdminNoticesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [studentsByBatch, setStudentsByBatch] = useState<Record<string, any[]>>({});
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [audience, setAudience] = useState<Audience>('everyone');
  const [batchId, setBatchId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bs }, { data: bm }, { data: ns }] = await Promise.all([
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase.from('batch_members').select('batch_id, student:profiles(id, full_name, student_code, email)'),
      supabase
        .from('notifications')
        .select('*')
        .eq('type', 'announcement')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const grouped: Record<string, any[]> = {};
    (bm ?? []).forEach((r: any) => { if (r.student) (grouped[r.batch_id] ??= []).push(r.student); });

    setBatches(bs ?? []);
    setStudentsByBatch(grouped);
    setNotices(ns ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allStudents = useMemo(() => {
    const seen = new Map<string, any>();
    Object.values(studentsByBatch).flat().forEach((s: any) => seen.set(s.id, s));
    return [...seen.values()].sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  }, [studentsByBatch]);

  const matchingStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return allStudents.slice(0, 8);
    return allStudents
      .filter((s) =>
        (s.full_name ?? '').toLowerCase().includes(q) ||
        (s.student_code ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allStudents, studentQuery]);

  const chosenStudent = allStudents.find((s) => s.id === studentId);
  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? 'a batch';

  const reach =
    audience === 'everyone' ? allStudents.length
      : audience === 'batch' ? (studentsByBatch[batchId]?.length ?? 0)
        : chosenStudent ? 1 : 0;

  const canSend =
    message.trim().length > 0 &&
    !sending &&
    (audience === 'everyone' || (audience === 'batch' && batchId) || (audience === 'student' && studentId));

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setSent(null);

    const row: any = {
      title: title.trim() || null,
      message: message.trim(),
      type: 'announcement',
      student_id: audience === 'student' ? studentId : null,
      batch_id: audience === 'batch' ? batchId : null
    };

    const { error } = await supabase.from('notifications').insert(row);
    setSending(false);

    if (error) {
      alert(`Could not post the notice: ${error.message}`);
      return;
    }

    setSent(
      audience === 'everyone' ? 'Posted to every student.'
        : audience === 'batch' ? `Posted to ${batchName(batchId)}.`
          : `Posted to ${chosenStudent?.full_name ?? 'the student'}.`
    );
    setTitle('');
    setMessage('');
    load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await supabase.from('notifications').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const audienceOf = (n: any) => {
    if (n.student_id) {
      const s = allStudents.find((x) => x.id === n.student_id);
      return { icon: UserIcon, label: s?.full_name ?? 'One student', cls: 'bg-violet-50 text-violet-700' };
    }
    if (n.batch_id) return { icon: LayersIcon, label: batchName(n.batch_id), cls: 'bg-amber-50 text-amber-700' };
    return { icon: GlobeIcon, label: 'Everyone', cls: 'bg-emerald-50 text-emerald-700' };
  };

  const tabCls = (active: boolean) =>
    `flex-1 h-11 rounded-xl text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
      active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Notices</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Announcements for your students. They appear on the student dashboard and in the bell at the top of the page.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* ── Compose ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4">Write a notice</h2>

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Who should see it?</label>
          <div className="flex gap-2 mb-4">
            <button type="button" className={tabCls(audience === 'everyone')} onClick={() => setAudience('everyone')}>
              <GlobeIcon className="w-4 h-4" /> Everyone
            </button>
            <button type="button" className={tabCls(audience === 'batch')} onClick={() => setAudience('batch')}>
              <LayersIcon className="w-4 h-4" /> One batch
            </button>
            <button type="button" className={tabCls(audience === 'student')} onClick={() => setAudience('student')}>
              <UserIcon className="w-4 h-4" /> One student
            </button>
          </div>

          {audience === 'batch' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Batch</label>
              <select className={inputCls} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Choose a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.exam_year ? `(${b.exam_year})` : ''} — {studentsByBatch[b.id]?.length ?? 0} students
                  </option>
                ))}
              </select>
            </div>
          )}

          {audience === 'student' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Student</label>
              {chosenStudent ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{chosenStudent.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{chosenStudent.student_code || chosenStudent.email}</p>
                  </div>
                  <button
                    onClick={() => { setStudentId(''); setStudentQuery(''); }}
                    className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className={inputCls}
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search by name, student ID or email"
                  />
                  <div className="mt-2 border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-56 overflow-y-auto">
                    {matchingStudents.length === 0 ? (
                      <p className="text-sm text-slate-400 px-3.5 py-3">No student matches that.</p>
                    ) : matchingStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStudentId(s.id)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.student_code || s.email}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Heading (optional)</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. No class this Sunday"
              maxLength={80}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notice</label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do your students need to know?"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {loading ? 'Loading students…' : `Goes to ${reach} student${reach === 1 ? '' : 's'}.`}
              {sent && <span className="block text-emerald-600 font-semibold mt-1">{sent}</span>}
            </p>
            <button
              onClick={send}
              disabled={!canSend}
              className="h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
            >
              {sending ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
              Post notice
            </button>
          </div>
        </div>

        {/* ── Posted ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-1">Posted</h2>
          <p className="text-xs text-slate-500 mb-4">
            Deleting a notice takes it off every student&rsquo;s dashboard.
          </p>

          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          ) : notices.length === 0 ? (
            <div className="py-10 text-center">
              <BellRingIcon className="w-9 h-9 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No notices posted yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[32rem] overflow-y-auto">
              {notices.map((n) => {
                const a = audienceOf(n);
                return (
                  <div key={n.id} className="rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${a.cls}`}>
                        <a.icon className="w-3 h-3" /> {a.label}
                      </span>
                      <button
                        onClick={() => setDeleteTarget(n)}
                        title="Delete notice"
                        className="text-slate-300 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                    {n.title && <p className="text-sm font-bold text-slate-900 mt-2">{n.title}</p>}
                    <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {new Date(n.created_at).toLocaleString('en-LK', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this notice?"
        message="It disappears from every student's dashboard. Students who already read it will simply stop seeing it."
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
