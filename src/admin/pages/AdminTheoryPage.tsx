import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  VideoIcon,
  FileTextIcon,
  SearchIcon,
  UploadCloudIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  CalendarIcon,
  XIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { extractYouTubeId as parseYouTubeId } from '../../lib/youtube';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

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
  const [vForm, setVForm] = useState<{ id: string; title: string; youtube: string; duration: string; kind: 'lesson' | 'paper'; tutes: { name: string; url: string }[] }>({ id: '', title: '', youtube: '', duration: '', kind: 'lesson', tutes: [] });
  const [tuteFiles, setTuteFiles] = useState<File[]>([]);
  const tuteRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [videoSavedMsg, setVideoSavedMsg] = useState('');
  const [liveLinks, setLiveLinks] = useState<{ label: string; url: string }[]>([]);

  // list organisation
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

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
    setLiveLinks([]);
    setThumbFile(null);
    setThumbPreview(undefined);
    setEditorOpen(true);
  };
  const openEdit = async (m: any) => {
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
    setLiveLinks([]);
    setEditorOpen(true);
    const { data: links } = await supabase.from('theory_live_links').select('*').eq('theory_month_id', m.id).order('sort_order');
    setLiveLinks((links ?? []).map((l: any) => ({ label: l.label ?? '', url: l.url ?? '' })));
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
    let monthId = editing?.id as string | undefined;
    let error;
    if (editing) {
      ({ error } = await supabase.from('theory_months').update(payload).eq('id', editing.id));
    } else {
      const res = await supabase.from('theory_months').insert(payload).select().single();
      error = res.error;
      monthId = res.data?.id;
    }
    if (error) {
      setSaving(false);
      alert(`Could not save the month:\n${error.message}`);
      return;
    }
    // sync live links (replace the set)
    if (monthId) {
      await supabase.from('theory_live_links').delete().eq('theory_month_id', monthId);
      const rows = liveLinks
        .filter((l) => l.url.trim())
        .map((l, i) => ({ theory_month_id: monthId, label: l.label.trim() || 'Join Live Class', url: l.url.trim(), sort_order: i }));
      if (rows.length) {
        const { error: linkErr } = await supabase.from('theory_live_links').insert(rows);
        if (linkErr) alert(`Month saved, but the live links could not be saved:\n${linkErr.message}\n\nIf this mentions a missing table, run supabase/migration_monthly_live.sql in the Supabase SQL editor.`);
      }
    }
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
    setVForm({ id: '', title: '', youtube: '', duration: '', kind: 'lesson', tutes: [] });
    setTuteFiles([]);
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
    if (!videosMonth || !vForm.title.trim() || (!vForm.youtube.trim() && vForm.tutes.length === 0 && tuteFiles.length === 0)) return;
    const tutes = [...vForm.tutes];
    for (const f of tuteFiles) {
      const path = `theory/${videosMonth.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.pdf`;
      const { error: upErr } = await supabase.storage.from('tutes').upload(path, f, { upsert: true, contentType: 'application/pdf' });
      if (upErr) {
        alert(`Could not upload "${f.name}":\n${upErr.message}\n\nIf the bucket is missing, run supabase/migration_tutes.sql in the Supabase SQL editor.`);
        return;
      }
      tutes.push({ name: f.name, url: supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl });
    }
    const payload = { title: vForm.title.trim(), youtube_id: vForm.youtube.trim() ? parseYouTubeId(vForm.youtube) : null, duration_label: vForm.duration || null, kind: vForm.kind, tutes };
    let error;
    if (vForm.id) ({ error } = await supabase.from('theory_videos').update(payload).eq('id', vForm.id));
    else {
      const nextOrder = videos.length ? Math.max(...videos.map((v) => v.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('theory_videos').insert({ ...payload, theory_month_id: videosMonth.id, sort_order: nextOrder }));
    }
    if (error) {
      alert(`Could not save the session:\n${error.message}\n\nIf this mentions a missing "tutes" column, run supabase/migration_tutes_multi.sql in the Supabase SQL editor.`);
      return;
    }
    setVForm({ id: '', title: '', youtube: '', duration: '', kind: 'lesson', tutes: [] });
    setTuteFiles([]);
    setVideoSavedMsg(`"${payload.title}" saved ✓ — ${tutes.length} PDF${tutes.length === 1 ? '' : 's'} attached`);
    window.setTimeout(() => setVideoSavedMsg(''), 6000);
    reloadVideos(videosMonth.id);
  };
  const editVideo = (v: any) => {
    setVForm({
      id: v.id, title: v.title, youtube: v.youtube_id, duration: v.duration_label ?? '',
      kind: v.kind === 'paper' ? 'paper' : 'lesson',
      tutes: Array.isArray(v.tutes) && v.tutes.length ? v.tutes : v.tute_url ? [{ name: 'Tute PDF', url: v.tute_url }] : []
    });
    setTuteFiles([]);
  };
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

  const filteredMonths = months.filter((m) => {
    const okStatus = statusFilter === 'all' || (statusFilter === 'published' ? m.is_published : !m.is_published);
    const hay = `${m.month} ${m.year} ${(m.topics ?? []).join(' ')}`.toLowerCase();
    return okStatus && hay.includes(search.toLowerCase());
  });
  // group by year (newest first), months in calendar order (newest first)
  const yearGroups: [string, any[]][] = [...new Set(filteredMonths.map((m) => String(m.year)))]
    .sort((a, b) => Number(b) - Number(a))
    .map((y) => [
      y,
      filteredMonths
        .filter((m) => String(m.year) === y)
        .sort((a, b) => MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month))
    ]);

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

      {/* toolbar: search + status filter */}
      {!loading && months.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="relative sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search month or topic…"
            />
          </div>
          <div className="flex rounded-lg bg-slate-200/60 p-0.5 w-fit">
            {([['all', `All ${months.length}`], ['published', `Published ${months.filter((m) => m.is_published).length}`], ['draft', `Drafts ${months.filter((m) => !m.is_published).length}`]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setStatusFilter(key)}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${statusFilter === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : months.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No months yet</p>
          <p className="text-sm text-slate-400 mt-1">Add a month to start uploading recordings.</p>
        </div>
      ) : filteredMonths.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <SearchIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No months match</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or clear the filter.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {yearGroups.map(([year, group]) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-2.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{year}</h2>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600">{group.length}</span>
              </div>
              <div className="space-y-3">
                {group.map((m) => (
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

          {/* monthly live class links — visible to students only after the monthly fee is approved */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Live class links</label>
            <p className="text-[11px] text-slate-400 mb-2">Zoom/Meet links for this month's live classes. Students see a "Join" button once their monthly payment is approved.</p>
            <div className="space-y-2">
              {liveLinks.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className={`${inputCls} !w-[38%]`} value={l.label} onChange={(e) => setLiveLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label (e.g. Saturday 7PM)" />
                  <input className={inputCls} value={l.url} onChange={(e) => setLiveLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://zoom.us/j/…" />
                  <button type="button" aria-label="Remove link" onClick={() => setLiveLinks((ls) => ls.filter((_, j) => j !== i))} className="h-11 px-2.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0"><XIcon className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setLiveLinks((ls) => [...ls, { label: '', url: '' }])} className="w-full h-10 rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2">
                <PlusIcon className="w-4 h-4" /> Add live link
              </button>
            </div>
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
          <input className={inputCls} value={vForm.youtube} onChange={(e) => setVForm({ ...vForm, youtube: e.target.value })} placeholder="YouTube link or ID (optional — leave blank for PDF only)" />
          <input className={inputCls} value={vForm.duration} onChange={(e) => setVForm({ ...vForm, duration: e.target.value })} placeholder="Duration e.g. 1 hr 20 mins" />

          {/* session type */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {([['lesson', 'Lesson video'], ['paper', 'Paper discussion']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setVForm({ ...vForm, kind: key })}
                className={`flex-1 h-8 rounded-md text-xs font-semibold transition-colors ${vForm.kind === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* tute PDFs — click again to add more, one by one or several at once */}
          <input ref={tuteRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only"
            onChange={(e) => {
              // snapshot BEFORE clearing — FileList is live and empties when value resets
              const picked = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (picked.length) setTuteFiles((f) => [...f, ...picked]);
            }} />
          <button type="button" onClick={() => tuteRef.current?.click()} className="w-full h-10 rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 px-3">
            <PlusIcon className="w-4 h-4 shrink-0" /> Add PDF{(vForm.tutes.length + tuteFiles.length) > 0 ? ` (${vForm.tutes.length + tuteFiles.length} attached — click to add another)` : ' (tute / paper — optional)'}
          </button>
          {(vForm.tutes.length > 0 || tuteFiles.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {vForm.tutes.map((t, i) => (
                <span key={`s${i}`} className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-slate-100 border border-slate-200 pl-2 pr-1 py-1 text-xs text-slate-700">
                  <FileTextIcon className="w-3 h-3 shrink-0 text-slate-400" />
                  <span className="truncate max-w-[160px]">{t.name}</span>
                  <button type="button" aria-label={`Remove ${t.name}`} onClick={() => setVForm({ ...vForm, tutes: vForm.tutes.filter((_, j) => j !== i) })} className="p-0.5 rounded text-slate-400 hover:text-red-500"><XIcon className="w-3 h-3" /></button>
                </span>
              ))}
              {tuteFiles.map((f, i) => (
                <span key={`q${i}`} className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-blue-50 border border-blue-100 pl-2 pr-1 py-1 text-xs text-blue-700">
                  <FileTextIcon className="w-3 h-3 shrink-0 text-blue-400" />
                  <span className="truncate max-w-[160px]">{f.name}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setTuteFiles((fs) => fs.filter((_, j) => j !== i))} className="p-0.5 rounded text-blue-400 hover:text-red-500"><XIcon className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {vForm.id && <button onClick={() => { setVForm({ id: '', title: '', youtube: '', duration: '', kind: 'lesson', tutes: [] }); setTuteFiles([]); }} className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>}
            <button onClick={saveVideo} disabled={!vForm.title.trim() || (!vForm.youtube.trim() && vForm.tutes.length === 0 && tuteFiles.length === 0)} className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {vForm.id ? 'Update session' : 'Add session'}
            </button>
          </div>
          {videoSavedMsg && <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{videoSavedMsg}</p>}
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
                <p className="text-xs text-slate-400 truncate">{v.kind === 'paper' ? '📝 Paper · ' : ''}{v.duration_label || '—'} · {v.youtube_id}{(() => { const n = Array.isArray(v.tutes) && v.tutes.length ? v.tutes.length : v.tute_url ? 1 : 0; return n ? ` · ${n} PDF${n > 1 ? 's' : ''}` : ''; })()}</p>
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
