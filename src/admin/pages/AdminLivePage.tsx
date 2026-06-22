import { useEffect, useState, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CalendarClockIcon,
  VideoIcon,
  Loader2Icon,
  ExternalLinkIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');

const emptyForm = {
  title: '',
  kind: 'monthly' as 'monthly' | 'special',
  month: MONTHS[now.getMonth()],
  year: String(now.getFullYear()),
  date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  time: '18:00',
  platform: 'zoom',
  join_url: '',
  backup_url: '',
  meeting_id: '',
  passcode: '',
  instructor: 'Pasindu Dissanayake',
  audience_scope: 'batches' as 'batches' | 'program' | 'public',
  audience_program: 'A/L',
  batch_ids: [] as string[]
};

export function AdminLivePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cs }, { data: bs }] = await Promise.all([
      supabase.from('live_classes').select('*').order('scheduled_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false })
    ]);
    setClasses(cs ?? []);
    setBatches(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? '—';
  const audienceText = (c: any) => {
    if (c.audience_scope === 'public') return 'Everyone';
    if (c.audience_scope === 'program') return `All ${c.audience_program}`;
    const ids: string[] = c.batch_ids ?? [];
    return ids.length === 0 ? 'No batches' : ids.length === 1 ? batchName(ids[0]) : `${ids.length} batches`;
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setEditorOpen(true); };
  const openEdit = (c: any) => {
    const d = c.scheduled_at ? new Date(c.scheduled_at) : now;
    setEditing(c);
    setForm({
      title: c.title ?? '',
      kind: c.kind ?? 'monthly',
      month: c.period_month ?? MONTHS[d.getMonth()],
      year: c.period_year ? String(c.period_year) : String(d.getFullYear()),
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      platform: c.platform ?? 'zoom',
      join_url: c.zoom_link ?? '',
      backup_url: c.backup_url ?? '',
      meeting_id: c.meeting_id ?? '',
      passcode: c.passcode ?? '',
      instructor: c.instructor ?? '',
      audience_scope: c.audience_scope ?? 'batches',
      audience_program: c.audience_program ?? 'A/L',
      batch_ids: c.batch_ids ?? []
    });
    setEditorOpen(true);
  };
  const toggleBatch = (id: string) =>
    setForm((f) => ({ ...f, batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter((x) => x !== id) : [...f.batch_ids, id] }));

  const save = async () => {
    if (!form.title.trim() || !form.join_url.trim()) return;
    setSaving(true);
    const scheduled = new Date(`${form.date}T${form.time}`).toISOString();
    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      period_month: form.kind === 'monthly' ? form.month : null,
      period_year: form.kind === 'monthly' ? Number(form.year) : null,
      scheduled_at: scheduled,
      platform: form.platform,
      zoom_link: form.join_url.trim(),
      backup_url: form.backup_url.trim() || null,
      meeting_id: form.meeting_id.trim() || null,
      passcode: form.passcode.trim() || null,
      instructor: form.instructor.trim() || null,
      course_label: null,
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : []
    };
    if (editing) await supabase.from('live_classes').update(payload).eq('id', editing.id);
    else await supabase.from('live_classes').insert(payload);
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('live_classes').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-LK', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Live classes</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New class
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Publish Zoom / YouTube live links. Monthly classes show to that month's paid students.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <CalendarClockIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No live classes yet</p>
          <p className="text-sm text-slate-400 mt-1">Schedule your first session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <VideoIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{c.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${c.kind === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                    {c.kind === 'monthly' ? `Monthly · ${c.period_month ?? ''}` : 'Special'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.scheduled_at ? fmt(c.scheduled_at) : '—'} · {c.platform} · {audienceText(c)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {c.zoom_link && (
                  <a href={c.zoom_link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="Open link"><ExternalLinkIcon className="w-4 h-4" /></a>
                )}
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit live class' : 'New live class'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim() || !form.join_url.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. March Theory — Networking" />
          </div>

          {/* kind */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })}>
                <option value="monthly">Monthly class</option>
                <option value="special">Special class</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Platform</label>
              <select className={inputCls} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="zoom">Zoom</option>
                <option value="youtube">YouTube Live</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {form.kind === 'monthly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">For which month</label>
                <select className={inputCls} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                  {MONTHS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
                <input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <p className="col-span-2 text-xs text-slate-400 -mt-1">Only students who paid {form.month} {form.year} fee will see this link.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Join link (Zoom or YouTube)</label>
            <input className={inputCls} value={form.join_url} onChange={(e) => setForm({ ...form, join_url: e.target.value })} placeholder="https://zoom.us/j/… or https://youtube.com/live/…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting ID (optional)</label>
              <input className={inputCls} value={form.meeting_id} onChange={(e) => setForm({ ...form, meeting_id: e.target.value })} placeholder="987 6543 210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Passcode (optional)</label>
              <input className={inputCls} value={form.passcode} onChange={(e) => setForm({ ...form, passcode: e.target.value })} placeholder="abc123" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Backup link (optional)</label>
            <input className={inputCls} value={form.backup_url} onChange={(e) => setForm({ ...form, backup_url: e.target.value })} placeholder="e.g. YouTube live link if Zoom fails" />
          </div>

          {/* audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Which batch(es)?</label>
            <select className={inputCls} value={form.audience_scope} onChange={(e) => setForm({ ...form, audience_scope: e.target.value as any })}>
              <option value="batches">Specific batches</option>
              <option value="program">A whole program</option>
              <option value="public">Everyone</option>
            </select>
            {form.audience_scope === 'program' && (
              <select className={`${inputCls} mt-2`} value={form.audience_program} onChange={(e) => setForm({ ...form, audience_program: e.target.value })}>
                <option value="A/L">All A/L</option>
                <option value="O/L">All O/L</option>
              </select>
            )}
            {form.audience_scope === 'batches' && (
              <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {batches.length === 0 && <p className="text-sm text-slate-400 p-3">No batches yet.</p>}
                {batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={form.batch_ids.includes(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded accent-blue-600" />
                    <span className="text-sm text-slate-700">{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="Students will no longer see this live class."
        confirmLabel="Delete class"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
