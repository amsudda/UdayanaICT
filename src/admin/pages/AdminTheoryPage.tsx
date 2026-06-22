import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  VideoIcon,
  UploadCloudIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  CalendarIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

function parseYouTubeId(input: string) {
  const s = input.trim();
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return s;
}

const now = new Date();
const emptyMonth = {
  month: MONTHS[now.getMonth()],
  year: String(now.getFullYear()),
  topics: '',
  audience_scope: 'batches' as 'batches' | 'program' | 'public',
  audience_program: 'A/L',
  batch_ids: [] as string[],
  is_published: false,
  thumbnail_url: '' as string | null
};

export function AdminTheoryPage() {
  const [months, setMonths] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyMonth);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [videosMonth, setVideosMonth] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [vForm, setVForm] = useState({ id: '', title: '', youtube: '', duration: '' });

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ms }, { data: bs }, { data: tv }] = await Promise.all([
      supabase.from('theory_months').select('*').order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false }),
      supabase.from('theory_videos').select('theory_month_id')
    ]);
    const c = (tv ?? []).reduce<Record<string, number>>((a, r: any) => { a[r.theory_month_id] = (a[r.theory_month_id] ?? 0) + 1; return a; }, {});
    setMonths(ms ?? []);
    setBatches(bs ?? []);
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? '—';
  const audienceText = (m: any) => {
    if (m.audience_scope === 'public') return 'Everyone';
    if (m.audience_scope === 'program') return `All ${m.audience_program}`;
    const ids: string[] = m.batch_ids ?? [];
    if (ids.length === 0) return 'No batches';
    if (ids.length === 1) return batchName(ids[0]);
    return `${ids.length} batches`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyMonth);
    setThumbFile(null);
    setThumbPreview(undefined);
    setEditorOpen(true);
  };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      month: m.month,
      year: String(m.year),
      topics: (m.topics ?? []).join(', '),
      audience_scope: m.audience_scope ?? 'batches',
      audience_program: m.audience_program ?? 'A/L',
      batch_ids: m.batch_ids ?? [],
      is_published: m.is_published ?? false,
      thumbnail_url: m.thumbnail_url ?? ''
    });
    setThumbFile(null);
    setThumbPreview(m.thumbnail_url ?? undefined);
    setEditorOpen(true);
  };
  const onThumb = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbFile(f);
    const r = new FileReader();
    r.onload = () => setThumbPreview(r.result as string);
    r.readAsDataURL(f);
  };
  const toggleBatch = (id: string) =>
    setForm((f) => ({ ...f, batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter((x) => x !== id) : [...f.batch_ids, id] }));

  const saveMonth = async () => {
    setSaving(true);
    let thumbUrl = form.thumbnail_url;
    if (thumbFile) {
      const ext = thumbFile.name.split('.').pop() || 'jpg';
      const path = `theory/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, thumbFile, { upsert: true });
      if (!error) thumbUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      month: form.month,
      year: Number(form.year),
      topics: form.topics ? form.topics.split(',').map((t) => t.trim()).filter(Boolean) : [],
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      is_published: form.is_published,
      thumbnail_url: thumbUrl || null
    };
    if (editing) await supabase.from('theory_months').update(payload).eq('id', editing.id);
    else await supabase.from('theory_months').insert(payload);
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  const togglePublish = async (m: any) => {
    await supabase.from('theory_months').update({ is_published: !m.is_published }).eq('id', m.id);
    load();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('theory_months').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  /* videos */
  const openVideos = async (m: any) => {
    setVideosMonth(m);
    setVForm({ id: '', title: '', youtube: '', duration: '' });
    const { data } = await supabase.from('theory_videos').select('*').eq('theory_month_id', m.id).order('sort_order');
    setVideos(data ?? []);
  };
  const reloadVideos = async (monthId: string) => {
    const { data } = await supabase.from('theory_videos').select('*').eq('theory_month_id', monthId).order('sort_order');
    setVideos(data ?? []);
    await supabase.from('theory_months').update({ session_count: (data ?? []).length }).eq('id', monthId);
    load();
  };
  const saveVideo = async () => {
    if (!videosMonth || !vForm.title.trim() || !vForm.youtube.trim()) return;
    const payload = { title: vForm.title.trim(), youtube_id: parseYouTubeId(vForm.youtube), duration_label: vForm.duration || null };
    if (vForm.id) await supabase.from('theory_videos').update(payload).eq('id', vForm.id);
    else {
      const nextOrder = videos.length ? Math.max(...videos.map((v) => v.sort_order ?? 0)) + 1 : 0;
      await supabase.from('theory_videos').insert({ ...payload, theory_month_id: videosMonth.id, sort_order: nextOrder });
    }
    setVForm({ id: '', title: '', youtube: '', duration: '' });
    reloadVideos(videosMonth.id);
  };
  const editVideo = (v: any) => setVForm({ id: v.id, title: v.title, youtube: v.youtube_id, duration: v.duration_label ?? '' });
  const deleteVideo = async (id: string) => {
    await supabase.from('theory_videos').delete().eq('id', id);
    if (videosMonth) reloadVideos(videosMonth.id);
  };
  const moveVideo = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const a = videos[idx], b = videos[j];
    await supabase.from('theory_videos').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('theory_videos').update({ sort_order: a.sort_order }).eq('id', b.id);
    if (videosMonth) reloadVideos(videosMonth.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Monthly recordings</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New month
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Group each month's live-class recordings. Students unlock a month once you approve that month's fee.
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : months.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No months yet</p>
          <p className="text-sm text-slate-400 mt-1">Add a month to start uploading recordings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((m) => (
            <div key={m.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <CalendarIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{m.month} {m.year}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${m.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{counts[m.id] ?? 0} sessions · {audienceText(m)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openVideos(m)} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <VideoIcon className="w-4 h-4" /> <span className="hidden sm:inline">Sessions</span>
                </button>
                <button onClick={() => togglePublish(m)} title={m.is_published ? 'Unpublish' : 'Publish'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  {m.is_published ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(m)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(m)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* month editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit month' : 'New month'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={saveMonth} disabled={saving} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Thumbnail (optional)</label>
            <input ref={thumbRef} type="file" accept="image/*" className="sr-only" onChange={onThumb} />
            <button type="button" onClick={() => thumbRef.current?.click()} className="w-full aspect-video rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 hover:border-blue-400">
              {thumbPreview ? <img src={thumbPreview} alt="" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-sm"><UploadCloudIcon className="w-5 h-5" /> Upload image</span>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
              <select className={inputCls} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
              <input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Topics (comma separated)</label>
            <input className={inputCls} value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} placeholder="Networking, Databases, Past paper" />
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
              <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
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

          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Publish now</span>
          </label>
        </div>
      </Drawer>

      {/* sessions drawer */}
      <Drawer open={!!videosMonth} onClose={() => setVideosMonth(null)} title={videosMonth ? `${videosMonth.month} ${videosMonth.year} — sessions` : ''}>
        <div className="bg-slate-50 rounded-xl p-3 mb-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{vForm.id ? 'Edit session' : 'Add a session'}</p>
          <input className={inputCls} value={vForm.title} onChange={(e) => setVForm({ ...vForm, title: e.target.value })} placeholder="e.g. Session 1 — Networking basics" />
          <input className={inputCls} value={vForm.youtube} onChange={(e) => setVForm({ ...vForm, youtube: e.target.value })} placeholder="YouTube link or ID" />
          <input className={inputCls} value={vForm.duration} onChange={(e) => setVForm({ ...vForm, duration: e.target.value })} placeholder="Duration e.g. 1 hr 20 mins" />
          <div className="flex gap-2">
            {vForm.id && <button onClick={() => setVForm({ id: '', title: '', youtube: '', duration: '' })} className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>}
            <button onClick={saveVideo} disabled={!vForm.title.trim() || !vForm.youtube.trim()} className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {vForm.id ? 'Update session' : 'Add session'}
            </button>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{videos.length} session{videos.length === 1 ? '' : 's'}</p>
        <div className="space-y-2">
          {videos.map((v, idx) => (
            <div key={v.id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-2.5 py-2">
              <div className="flex flex-col">
                <button onClick={() => moveVideo(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                <button onClick={() => moveVideo(idx, 1)} disabled={idx === videos.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
              </div>
              <GripVerticalIcon className="w-4 h-4 text-slate-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{v.title}</p>
                <p className="text-xs text-slate-400 truncate">{v.duration_label || '—'} · {v.youtube_id}</p>
              </div>
              <button onClick={() => editVideo(v)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
              <button onClick={() => deleteVideo(v.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
            </div>
          ))}
          {videos.length === 0 && <p className="text-sm text-slate-400">No sessions yet.</p>}
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.month} ${deleteTarget?.year}?`}
        message="This removes the month and all its session recordings."
        confirmLabel="Delete month"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
