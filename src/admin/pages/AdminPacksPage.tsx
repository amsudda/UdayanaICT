import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  FilmIcon,
  UploadCloudIcon,
  GripVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPES = ['Paper Classes', 'Theory', 'Revision'];
const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

/** pull the video id out of any YouTube URL (or accept a raw id) */
function parseYouTubeId(input: string) {
  const s = input.trim();
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return s;
}

const emptyPack = {
  title: '',
  type: 'Theory',
  price: '',
  duration_label: '',
  description: '',
  audience_scope: 'batches' as 'batches' | 'program' | 'public',
  audience_program: 'A/L',
  batch_ids: [] as string[],
  is_published: false,
  thumbnail_url: '' as string | null
};

export function AdminPacksPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // pack editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyPack);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  // videos
  const [videosPack, setVideosPack] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [vForm, setVForm] = useState({ id: '', title: '', youtube: '', duration: '', description: '' });

  // delete
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ps }, { data: bs }, { data: pv }] = await Promise.all([
      supabase.from('packs').select('*').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false }),
      supabase.from('pack_videos').select('pack_id')
    ]);
    const c = (pv ?? []).reduce<Record<string, number>>((a, r: any) => { a[r.pack_id] = (a[r.pack_id] ?? 0) + 1; return a; }, {});
    setPacks(ps ?? []);
    setBatches(bs ?? []);
    setCounts(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? '—';
  const audienceText = (p: any) => {
    if (p.audience_scope === 'public') return 'Everyone';
    if (p.audience_scope === 'program') return `All ${p.audience_program}`;
    const ids: string[] = p.batch_ids ?? [];
    if (ids.length === 0) return 'No batches';
    if (ids.length === 1) return batchName(ids[0]);
    return `${ids.length} batches`;
  };

  /* ---- pack create/edit ---- */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyPack);
    setThumbFile(null);
    setThumbPreview(undefined);
    setEditorOpen(true);
  };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title ?? '',
      type: p.type ?? 'Theory',
      price: p.price != null ? String(p.price) : '',
      duration_label: p.duration_label ?? '',
      description: p.description ?? '',
      audience_scope: p.audience_scope ?? 'batches',
      audience_program: p.audience_program ?? 'A/L',
      batch_ids: p.batch_ids ?? [],
      is_published: p.is_published ?? false,
      thumbnail_url: p.thumbnail_url ?? ''
    });
    setThumbFile(null);
    setThumbPreview(p.thumbnail_url ?? undefined);
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

  const savePack = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let thumbUrl = form.thumbnail_url;
    if (thumbFile) {
      const ext = thumbFile.name.split('.').pop() || 'jpg';
      const path = `packs/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, thumbFile, { upsert: true });
      if (!upErr) thumbUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      title: form.title.trim(),
      type: form.type,
      price: form.price ? Number(form.price) : 0,
      duration_label: form.duration_label || null,
      description: form.description || null,
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      is_published: form.is_published,
      thumbnail_url: thumbUrl || null
    };
    if (editing) await supabase.from('packs').update(payload).eq('id', editing.id);
    else await supabase.from('packs').insert(payload);
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  const togglePublish = async (p: any) => {
    await supabase.from('packs').update({ is_published: !p.is_published }).eq('id', p.id);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('packs').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  /* ---- videos ---- */
  const openVideos = async (p: any) => {
    setVideosPack(p);
    setVForm({ id: '', title: '', youtube: '', duration: '', description: '' });
    const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', p.id).order('sort_order');
    setVideos(data ?? []);
  };
  const reloadVideos = async (packId: string) => {
    const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', packId).order('sort_order');
    setVideos(data ?? []);
    load();
  };
  const saveVideo = async () => {
    if (!videosPack || !vForm.title.trim() || !vForm.youtube.trim()) return;
    const payload = {
      title: vForm.title.trim(),
      youtube_id: parseYouTubeId(vForm.youtube),
      duration_label: vForm.duration || null,
      description: vForm.description || null
    };
    if (vForm.id) {
      await supabase.from('pack_videos').update(payload).eq('id', vForm.id);
    } else {
      const nextOrder = videos.length ? Math.max(...videos.map((v) => v.sort_order ?? 0)) + 1 : 0;
      await supabase.from('pack_videos').insert({ ...payload, pack_id: videosPack.id, sort_order: nextOrder });
    }
    setVForm({ id: '', title: '', youtube: '', duration: '', description: '' });
    reloadVideos(videosPack.id);
  };
  const editVideo = (v: any) =>
    setVForm({ id: v.id, title: v.title, youtube: v.youtube_id, duration: v.duration_label ?? '', description: v.description ?? '' });
  const deleteVideo = async (id: string) => {
    await supabase.from('pack_videos').delete().eq('id', id);
    if (videosPack) reloadVideos(videosPack.id);
  };
  const moveVideo = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const a = videos[idx], b = videos[j];
    await supabase.from('pack_videos').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('pack_videos').update({ sort_order: a.sort_order }).eq('id', b.id);
    if (videosPack) reloadVideos(videosPack.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Packs &amp; videos</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New pack
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Create video packs, add YouTube videos, target batches and publish.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : packs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <FilmIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No packs yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first video pack.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                {p.thumbnail_url && <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.type} · Rs. {Number(p.price).toLocaleString()} · {counts[p.id] ?? 0} videos · {audienceText(p)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openVideos(p)} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <FilmIcon className="w-4 h-4" /> <span className="hidden sm:inline">Videos</span>
                </button>
                <button onClick={() => togglePublish(p)} title={p.is_published ? 'Unpublish' : 'Publish'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  {p.is_published ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(p)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* pack editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit pack' : 'New pack'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={savePack} disabled={saving || !form.title.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* thumbnail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Thumbnail</label>
            <input ref={thumbRef} type="file" accept="image/*" className="sr-only" onChange={onThumb} />
            <button type="button" onClick={() => thumbRef.current?.click()} className="w-full aspect-video rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 hover:border-blue-400">
              {thumbPreview ? <img src={thumbPreview} alt="" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-sm"><UploadCloudIcon className="w-5 h-5" /> Upload image</span>}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. A/L ICT 2023 Paper Discussion" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (Rs.)</label>
              <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration label</label>
            <input className={inputCls} value={form.duration_label} onChange={(e) => setForm({ ...form, duration_label: e.target.value })} placeholder="e.g. 5 Hours" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Who can see &amp; buy this?</label>
            <select className={inputCls} value={form.audience_scope} onChange={(e) => setForm({ ...form, audience_scope: e.target.value as any })}>
              <option value="batches">Specific batches</option>
              <option value="program">A whole program (all O/L or all A/L)</option>
              <option value="public">Everyone</option>
            </select>

            {form.audience_scope === 'program' && (
              <select className={`${inputCls} mt-2`} value={form.audience_program} onChange={(e) => setForm({ ...form, audience_program: e.target.value })}>
                <option value="A/L">All A/L students</option>
                <option value="O/L">All O/L students</option>
              </select>
            )}

            {form.audience_scope === 'batches' && (
              <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {batches.length === 0 && <p className="text-sm text-slate-400 p-3">No batches yet — create one first.</p>}
                {batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={form.batch_ids.includes(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded accent-blue-600" />
                    <span className="text-sm text-slate-700">{b.name}</span>
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${b.program === 'A/L' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>{b.program}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1.5">Tip: tick multiple batches (e.g. A/L 2027 + 2028) so early-completers can buy too.</p>
          </div>

          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Publish now (visible to students)</span>
          </label>
        </div>
      </Drawer>

      {/* videos drawer */}
      <Drawer open={!!videosPack} onClose={() => setVideosPack(null)} title={videosPack ? `${videosPack.title} — videos` : ''}>
        {/* add / edit video */}
        <div className="bg-slate-50 rounded-xl p-3 mb-5 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{vForm.id ? 'Edit video' : 'Add a video'}</p>
          <input className={inputCls} value={vForm.title} onChange={(e) => setVForm({ ...vForm, title: e.target.value })} placeholder="Video title" />
          <input className={inputCls} value={vForm.youtube} onChange={(e) => setVForm({ ...vForm, youtube: e.target.value })} placeholder="YouTube link or ID" />
          <input className={inputCls} value={vForm.duration} onChange={(e) => setVForm({ ...vForm, duration: e.target.value })} placeholder="Duration e.g. 45 mins" />
          <div className="flex gap-2">
            {vForm.id && (
              <button onClick={() => setVForm({ id: '', title: '', youtube: '', duration: '', description: '' })} className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            )}
            <button onClick={saveVideo} disabled={!vForm.title.trim() || !vForm.youtube.trim()} className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {vForm.id ? 'Update video' : 'Add video'}
            </button>
          </div>
        </div>

        {/* video list */}
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{videos.length} video{videos.length === 1 ? '' : 's'}</p>
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
          {videos.length === 0 && <p className="text-sm text-slate-400">No videos yet.</p>}
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.title}?`}
        message="This removes the pack and all its videos. Students who bought it will lose access."
        confirmLabel="Delete pack"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
