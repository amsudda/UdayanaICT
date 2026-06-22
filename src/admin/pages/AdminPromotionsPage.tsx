import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MegaphoneIcon,
  UploadCloudIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const emptyForm = {
  tag: '',
  title: '',
  description: '',
  cta_text: '',
  cta_link: '/signup',
  audience_scope: 'public' as 'public' | 'program' | 'batches',
  audience_program: 'A/L',
  batch_ids: [] as string[],
  is_active: true,
  image_url: '' as string | null,
  image_fit: 'cover',
  image_position: 'center'
};

const POSITIONS = [
  ['left top', 'top', 'right top'],
  ['left', 'center', 'right'],
  ['left bottom', 'bottom', 'right bottom']
];

export function AdminPromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ps }, { data: bs }] = await Promise.all([
      supabase.from('promotions').select('*').order('sort_order').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false })
    ]);
    setPromos(ps ?? []);
    setBatches(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name ?? '—';
  const audienceText = (p: any) =>
    p.audience_scope === 'public' ? 'Everyone (landing page)'
    : p.audience_scope === 'program' ? `All ${p.audience_program}`
    : (p.batch_ids ?? []).length === 1 ? batchName(p.batch_ids[0])
    : `${(p.batch_ids ?? []).length} batches`;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImgFile(null); setImgPreview(undefined); setEditorOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      tag: p.tag ?? '', title: p.title ?? '', description: p.description ?? '',
      cta_text: p.cta_text ?? '', cta_link: p.cta_link ?? '',
      audience_scope: p.audience_scope ?? 'public', audience_program: p.audience_program ?? 'A/L',
      batch_ids: p.batch_ids ?? [], is_active: p.is_active ?? true, image_url: p.image_url ?? '',
      image_fit: p.image_fit ?? 'cover', image_position: p.image_position ?? 'center'
    });
    setImgFile(null);
    setImgPreview(p.image_url ?? undefined);
    setEditorOpen(true);
  };
  const onImg = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    const r = new FileReader();
    r.onload = () => setImgPreview(r.result as string);
    r.readAsDataURL(f);
  };
  const toggleBatch = (id: string) =>
    setForm((f) => ({ ...f, batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter((x) => x !== id) : [...f.batch_ids, id] }));

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let imageUrl = form.image_url;
    if (imgFile) {
      const ext = imgFile.name.split('.').pop() || 'jpg';
      const path = `promos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, imgFile, { upsert: true });
      if (!error) imageUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      tag: form.tag.trim() || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      cta_text: form.cta_text.trim() || null,
      cta_link: form.cta_link.trim() || null,
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      is_active: form.is_active,
      image_url: imageUrl || null,
      image_fit: form.image_fit,
      image_position: form.image_position
    };
    if (editing) await supabase.from('promotions').update(payload).eq('id', editing.id);
    else await supabase.from('promotions').insert({ ...payload, sort_order: promos.length });
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  const toggleActive = async (p: any) => {
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id);
    load();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= promos.length) return;
    const a = promos[idx], b = promos[j];
    await supabase.from('promotions').update({ sort_order: b.sort_order ?? j }).eq('id', a.id);
    await supabase.from('promotions').update({ sort_order: a.sort_order ?? idx }).eq('id', b.id);
    load();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('promotions').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New promotion
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Slides for the landing page and in-app announcements. "Everyone" promos appear on the public landing page.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : promos.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <MegaphoneIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No promotions yet</p>
          <p className="text-sm text-slate-400 mt-1">Add a slide for the landing page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === promos.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
              </div>
              <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{p.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{p.tag ? `${p.tag} · ` : ''}{audienceText(p)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(p)} title={p.is_active ? 'Hide' : 'Show'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  {p.is_active ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(p)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit promotion' : 'New promotion'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* live landing preview — matches the homepage carousel */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Landing preview</label>
            <div className="rounded-xl overflow-hidden relative bg-slate-900" style={{ aspectRatio: '16 / 7' }}>
              {imgPreview && (
                <img src={imgPreview} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: form.image_fit as any, objectPosition: form.image_position }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
              <div className="absolute inset-0 flex flex-col justify-center items-start p-4">
                {form.tag && <span className="inline-block py-0.5 px-2 rounded-full bg-blue-600 text-white text-[8px] font-bold mb-1.5">{form.tag}</span>}
                <p className="text-white font-bold text-sm leading-tight line-clamp-2 max-w-[75%]">{form.title || 'Promotion title'}</p>
                {form.description && <p className="text-gray-200 text-[10px] mt-1 leading-snug line-clamp-2 max-w-[70%]">{form.description}</p>}
                {form.cta_text && <span className="mt-2 inline-block bg-blue-600 text-white text-[9px] font-semibold px-2.5 py-1 rounded-full">{form.cta_text}</span>}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Text sits on the <strong>left</strong> — keep the important part of your image on the right.</p>
          </div>

          {/* upload */}
          <div>
            <input ref={imgRef} type="file" accept="image/*" className="sr-only" onChange={onImg} />
            <button type="button" onClick={() => imgRef.current?.click()} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium">
              <UploadCloudIcon className="w-4 h-4" /> {imgPreview ? 'Change image' : 'Upload image'}
            </button>
          </div>

          {/* fit + focal point */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Image fit</label>
              <div className="flex gap-2">
                {(['cover', 'contain'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setForm({ ...form, image_fit: f })}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold capitalize transition-colors ${form.image_fit === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Cover fills &amp; crops · Contain shows it all.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Focal point</label>
              <div className="inline-grid grid-cols-3 gap-1">
                {POSITIONS.flat().map((pos) => (
                  <button key={pos} type="button" title={pos} onClick={() => setForm({ ...form, image_position: pos })}
                    className={`w-7 h-7 rounded border transition-colors ${form.image_position === pos ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 hover:border-blue-400'}`}>
                    <span className={`block w-1.5 h-1.5 rounded-full mx-auto ${form.image_position === pos ? 'bg-white' : 'bg-slate-300'}`} />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Which part to keep when cropping.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tag (small label)</label>
            <input className={inputCls} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. New course / Limited time" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Special Revision Camp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Button text</label>
              <input className={inputCls} value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Register Now" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Button link</label>
              <input className={inputCls} value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="/signup" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Show to</label>
            <select className={inputCls} value={form.audience_scope} onChange={(e) => setForm({ ...form, audience_scope: e.target.value as any })}>
              <option value="public">Everyone (incl. landing page)</option>
              <option value="program">A whole program</option>
              <option value="batches">Specific batches</option>
            </select>
            {form.audience_scope === 'program' && (
              <select className={`${inputCls} mt-2`} value={form.audience_program} onChange={(e) => setForm({ ...form, audience_program: e.target.value })}>
                <option value="A/L">All A/L</option>
                <option value="O/L">All O/L</option>
              </select>
            )}
            {form.audience_scope === 'batches' && (
              <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
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
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Active (visible)</span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This removes the promotion."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
