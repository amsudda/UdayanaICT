import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  UploadCloudIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BookMarkedIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BookMockup } from '../../components/shared/BookMockup';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const emptyForm = {
  title: '',
  price: '',
  order_link: 'https://wa.me/94719735601',
  cover_url: '' as string | null,
  is_visible: true
};

export function AdminBooksPage() {
  const [books, setBooks] = useState<any[]>([]);
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
    const { data } = await supabase.from('books').select('*').order('sort_order').order('created_at', { ascending: false });
    setBooks(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImgFile(null); setImgPreview(undefined); setEditorOpen(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      title: b.title ?? '', price: b.price ?? '',
      order_link: b.order_link ?? '', cover_url: b.cover_url ?? '',
      is_visible: b.is_visible ?? true
    });
    setImgFile(null);
    setImgPreview(b.cover_url ?? undefined);
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

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let coverUrl = form.cover_url;
    if (imgFile) {
      const ext = imgFile.name.split('.').pop() || 'jpg';
      const path = `books/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, imgFile, { upsert: true });
      if (!error) coverUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      title: form.title.trim(),
      price: form.price.trim() || null,
      order_link: form.order_link.trim() || null,
      cover_url: coverUrl || null,
      is_visible: form.is_visible
    };
    let error;
    if (editing) ({ error } = await supabase.from('books').update(payload).eq('id', editing.id));
    else ({ error } = await supabase.from('books').insert({ ...payload, sort_order: books.length }));
    setSaving(false);
    if (error) {
      alert(`Could not save the book:\n${error.message}\n\nIf this mentions a missing table, run supabase/migration_books.sql in the Supabase SQL editor.`);
      return;
    }
    setEditorOpen(false);
    load();
  };

  const toggleVisible = async (b: any) => {
    await supabase.from('books').update({ is_visible: !b.is_visible }).eq('id', b.id);
    load();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= books.length) return;
    const a = books[idx], b = books[j];
    await supabase.from('books').update({ sort_order: b.sort_order ?? j }).eq('id', a.id);
    await supabase.from('books').update({ sort_order: a.sort_order ?? idx }).eq('id', b.id);
    load();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('books').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Books</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New book
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Short notes, model paper books, etc. Upload just the flat cover — the landing page turns it into a 3D book mockup automatically.
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : books.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <BookMarkedIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No books yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first book — the landing section appears once at least one is visible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((b, idx) => (
            <div key={b.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === books.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
              </div>
              <div className="w-12 h-16 rounded-md bg-slate-100 overflow-hidden shrink-0 shadow-sm">
                {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{b.title}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${b.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{[b.price, b.order_link].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleVisible(b)} title={b.is_visible ? 'Hide' : 'Show'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  {b.is_visible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(b)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(b)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit book' : 'New book'}
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
          {/* live 3D mockup preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mockup preview</label>
            <div className="rounded-xl bg-slate-50 border border-slate-200 py-8 flex justify-center">
              {imgPreview ? (
                <BookMockup cover={imgPreview} title={form.title} className="w-40" />
              ) : (
                <p className="text-sm text-slate-400 self-center">Upload a cover to see the 3D mockup</p>
              )}
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 mt-1.5">
              📐 Recommended cover size: <strong>1000 × 1400 px</strong> (portrait, 10:14). JPG or PNG — just the flat cover, the 3D effect is automatic.
            </p>
          </div>

          {/* upload */}
          <div>
            <input ref={imgRef} type="file" accept="image/*" className="sr-only" onChange={onImg} />
            <button type="button" onClick={() => imgRef.current?.click()} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium">
              <UploadCloudIcon className="w-4 h-4" /> {imgPreview ? 'Change cover' : 'Upload cover'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. A/L ICT Short Notes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
              <input className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Rs. 750" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Order link</label>
              <input className={inputCls} value={form.order_link} onChange={(e) => setForm({ ...form, order_link: e.target.value })} placeholder="https://wa.me/94719735601" />
            </div>
          </div>

          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Visible on landing page</span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This removes the book from the showcase."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
