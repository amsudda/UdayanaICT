import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon, PencilIcon, Trash2Icon, GraduationCapIcon, UploadCloudIcon,
  Loader2Icon, EyeIcon, EyeOffIcon, ChevronUpIcon, ChevronDownIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';
const empty = { tag: '', title: '', description: '', is_active: true, image_url: '' as string | null };

export function AdminFeaturedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(empty);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('featured_courses').select('*').order('sort_order').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(empty); setImgFile(null); setImgPreview(undefined); setEditorOpen(true); };
  const openEdit = (it: any) => {
    setEditing(it);
    setForm({ tag: it.tag ?? '', title: it.title ?? '', description: it.description ?? '', is_active: it.is_active ?? true, image_url: it.image_url ?? '' });
    setImgFile(null); setImgPreview(it.image_url ?? undefined); setEditorOpen(true);
  };
  const onImg = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgFile(f);
    const r = new FileReader(); r.onload = () => setImgPreview(r.result as string); r.readAsDataURL(f);
  };
  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let imageUrl = form.image_url;
    if (imgFile) {
      const ext = imgFile.name.split('.').pop() || 'jpg';
      const path = `featured/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, imgFile, { upsert: true });
      if (!error) imageUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = { tag: form.tag.trim() || null, title: form.title.trim(), description: form.description.trim() || null, is_active: form.is_active, image_url: imageUrl || null };
    if (editing) await supabase.from('featured_courses').update(payload).eq('id', editing.id);
    else await supabase.from('featured_courses').insert({ ...payload, sort_order: items.length });
    setSaving(false); setEditorOpen(false); load();
  };
  const toggleActive = async (it: any) => { await supabase.from('featured_courses').update({ is_active: !it.is_active }).eq('id', it.id); load(); };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir; if (j < 0 || j >= items.length) return;
    const a = items[idx], b = items[j];
    await supabase.from('featured_courses').update({ sort_order: b.sort_order ?? j }).eq('id', a.id);
    await supabase.from('featured_courses').update({ sort_order: a.sort_order ?? idx }).eq('id', b.id);
    load();
  };
  const confirmDelete = async () => { if (!deleteTarget) return; await supabase.from('featured_courses').delete().eq('id', deleteTarget.id); setDeleteTarget(null); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Featured Courses</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><PlusIcon className="w-4 h-4" /> New card</button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Marketing cards shown on the public landing page to attract sign-ups. (Separate from real packs.)</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <GraduationCapIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No featured courses</p>
          <p className="text-sm text-slate-400 mt-1">The landing page hides this section until you add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
              </div>
              <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">{it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{it.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${it.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{it.is_active ? 'Visible' : 'Hidden'}</span>
                </div>
                {it.tag && <p className="text-xs text-slate-500 mt-0.5">{it.tag}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(it)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">{it.is_active ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}</button>
                <button onClick={() => openEdit(it)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(it)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? 'Edit card' : 'New featured card'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">{saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save</button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Image</label>
            <input ref={imgRef} type="file" accept="image/*" className="sr-only" onChange={onImg} />
            <button type="button" onClick={() => imgRef.current?.click()} className="w-full aspect-video rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 hover:border-blue-400">
              {imgPreview ? <img src={imgPreview} alt="" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-sm"><UploadCloudIcon className="w-5 h-5" /> Upload image</span>}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category / tag</label>
            <input className={inputCls} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. A/L Theory" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. A/L ICT Theory 2026" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short blurb shown on the card" />
          </div>
          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Show on landing page</span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.title}"?`} message="This removes the featured card from the landing page." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
