import { useEffect, useState, useCallback, useRef, type ChangeEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, PencilIcon, Trash2Icon, FilmIcon, FileTextIcon,
  SearchIcon, UploadCloudIcon, GripVerticalIcon, ChevronUpIcon,
  ChevronDownIcon, Loader2Icon, EyeIcon, EyeOffIcon, XIcon,
  ArrowLeftIcon, PlayCircleIcon, UsersIcon, LayoutGridIcon,
  CheckCircle2Icon, ShieldAlertIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { extractYouTubeId as parseYouTubeId } from '../../lib/youtube';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPES = ['Paper Classes', 'Theory', 'Revision'];
const inputCls = 'w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]';

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
  is_free: false,
  thumbnail_url: '' as string | null
};

export function AdminPacksPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'list' | 'edit_pack' | 'manage_videos'>('list');
  const [activePack, setActivePack] = useState<any | null>(null);

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

  const handleNav = (v: 'list' | 'edit_pack' | 'manage_videos', p: any | null = null) => {
    setActivePack(p);
    setView(v);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-24">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <PackListView packs={packs} batches={batches} counts={counts} loading={loading} onNav={handleNav} onReload={load} />
          </motion.div>
        )}
        {view === 'edit_pack' && (
          <motion.div key="edit_pack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <PackEditorView pack={activePack} batches={batches} onNav={handleNav} onReload={load} />
          </motion.div>
        )}
        {view === 'manage_videos' && (
          <motion.div key="manage_videos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <VideoManagerView pack={activePack} onNav={handleNav} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 1. LIST VIEW
// --------------------------------------------------------------------------------

function PackListView({ packs, batches, counts, loading, onNav, onReload }: any) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const filtered = packs.filter((p: any) => {
    const okType = typeFilter === 'All' || (p.type ?? 'Other') === typeFilter;
    const okStatus = statusFilter === 'all' || (statusFilter === 'published' ? p.is_published : !p.is_published);
    const okSearch = (p.title ?? '').toLowerCase().includes(search.toLowerCase());
    return okType && okStatus && okSearch;
  });

  const togglePublish = async (p: any) => {
    await supabase.from('packs').update({ is_published: !p.is_published }).eq('id', p.id);
    onReload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('packs').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    onReload();
  };

  const batchName = (id: string) => batches.find((b: any) => b.id === id)?.name ?? '—';
  const audienceText = (p: any) => {
    if (p.audience_scope === 'public') return 'Everyone';
    if (p.audience_scope === 'program') return `All ${p.audience_program}`;
    const ids: string[] = p.batch_ids ?? [];
    if (ids.length === 0) return 'No batches';
    if (ids.length === 1) return batchName(ids[0]);
    return `${ids.length} batches`;
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Video Packages</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">Create and manage content packages. Organize videos, set pricing, and control which batches have access to your material.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex text-center pr-6 border-r border-slate-200">
            <div className="px-4">
              <p className="text-2xl font-bold text-slate-900">{packs.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">Total</p>
            </div>
            <div className="px-4">
              <p className="text-2xl font-bold text-emerald-600">{packs.filter((p: any) => p.is_published).length}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 font-bold mt-0.5">Live</p>
            </div>
          </div>
          <button onClick={() => onNav('edit_pack')} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#c20f24] rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
            <PlusIcon className="w-4 h-4" /> New Package
          </button>
        </div>
      </div>

      {/* FILTERS */}
      {!loading && packs.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center flex-1 gap-4 px-2">
            <SearchIcon className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              className="w-full h-10 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages by title..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-2 lg:pl-4 lg:border-l border-slate-100">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['all', 'published', 'draft'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${statusFilter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {['All', ...TYPES].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    typeFilter === t 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2Icon className="w-8 h-8 text-slate-300 animate-spin" />
        </div>
      ) : packs.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/60 shadow-sm text-center px-4">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <LayoutGridIcon className="w-10 h-10 text-red-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No packages created yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-8">Packages are collections of videos and resources that students can access or purchase.</p>
          <button onClick={() => onNav('edit_pack')} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#c20f24] rounded-xl hover:bg-red-700 transition-all shadow-sm">
            <PlusIcon className="w-4 h-4" /> Create First Package
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <SearchIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-900 mb-1">No matches found</p>
          <p className="text-sm text-slate-500">Adjust your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p: any) => (
            <div key={p.id} className="group flex flex-col bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
              {/* Thumbnail Area */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon className="w-10 h-10 text-slate-300" />
                  </div>
                )}
                {/* Status Badges Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                    p.is_published 
                      ? 'bg-emerald-500/90 text-white shadow-sm' 
                      : 'bg-white/90 text-slate-700 shadow-sm'
                  }`}>
                    {p.is_published ? 'Live' : 'Draft'}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                    {p.type}
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex flex-col flex-1 p-6">
                <div className="flex-1 mb-6">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{p.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{p.description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pricing</p>
                    <p className="text-sm font-semibold text-slate-900">{p.is_free ? <span className="text-emerald-600">Free</span> : `Rs. ${Number(p.price).toLocaleString()}`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Audience</p>
                    <p className="text-sm font-semibold text-slate-900 truncate" title={audienceText(p)}>{audienceText(p)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3">
                  <button 
                    onClick={() => onNav('manage_videos', p)}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-slate-50 hover:bg-[#c20f24] text-slate-700 hover:text-white rounded-xl text-sm font-bold transition-colors group/btn"
                  >
                    <PlayCircleIcon className="w-4 h-4 text-slate-400 group-hover/btn:text-white/80" /> 
                    <span>{counts[p.id] ?? 0} Videos</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePublish(p)} title={p.is_published ? 'Unpublish' : 'Publish'} className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                      {p.is_published ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onNav('edit_pack', p)} title="Edit Details" className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} title="Delete Package" className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.title}?`}
        message="This permanently removes the package and all its videos. Students who purchased it will lose access immediately. This action cannot be undone."
        confirmLabel="Delete Package"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// --------------------------------------------------------------------------------
// 2. PACK EDITOR VIEW
// --------------------------------------------------------------------------------

function PackEditorView({ pack, batches, onNav, onReload }: any) {
  const [form, setForm] = useState(pack ? {
    title: pack.title ?? '',
    type: pack.type ?? 'Theory',
    price: pack.price != null ? String(pack.price) : '',
    duration_label: pack.duration_label ?? '',
    description: pack.description ?? '',
    audience_scope: pack.audience_scope ?? 'batches',
    audience_program: pack.audience_program ?? 'A/L',
    batch_ids: pack.batch_ids ?? [],
    is_published: pack.is_published ?? false,
    is_free: pack.is_free ?? false,
    thumbnail_url: pack.thumbnail_url ?? ''
  } : emptyPack);

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | undefined>(pack?.thumbnail_url ?? undefined);
  const [saving, setSaving] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

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
      price: form.is_free ? 0 : (form.price ? Number(form.price) : 0),
      is_free: form.is_free,
      duration_label: form.duration_label || null,
      description: form.description || null,
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      is_published: form.is_published,
      thumbnail_url: thumbUrl || null
    };

    if (pack) {
      await supabase.from('packs').update(payload).eq('id', pack.id);
    } else {
      await supabase.from('packs').insert(payload);
    }
    
    setSaving(false);
    onReload();
    onNav('list');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => onNav('list')} className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pack ? 'Edit Package' : 'Create New Package'}</h1>
            <p className="text-sm text-slate-500">Configure package details, media, and access rules.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNav('list')} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            Cancel
          </button>
          <button onClick={savePack} disabled={saving || !form.title.trim()} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#c20f24] rounded-xl hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]">
            {saving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckCircle2Icon className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Package'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* LEFT COL: MEDIA & BASIC */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"><FilmIcon className="w-5 h-5 text-slate-400" /> Identity & Content</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Package Title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Complete A/L ICT Revision 2024" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea rows={4} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what students will learn in this package..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Thumbnail Cover</label>
                <input ref={thumbRef} type="file" accept="image/*" className="sr-only" onChange={onThumb} />
                <div 
                  onClick={() => thumbRef.current?.click()} 
                  className="group relative w-full aspect-video sm:w-3/4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-pointer hover:border-[#c20f24]/50 transition-colors flex items-center justify-center"
                >
                  {thumbPreview ? (
                    <>
                      <img src={thumbPreview} alt="Thumbnail preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-white text-sm font-bold">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-[#c20f24] transition-colors">
                        <UploadCloudIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Click to upload thumbnail</p>
                      <p className="text-xs text-slate-500 mt-1">16:9 aspect ratio recommended</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: PRICING & ACCESS */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-slate-400" /> Access & Pricing</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <div className="relative">
                  <select className={`${inputCls} appearance-none pr-10`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#c20f24] focus:ring-[#c20f24]" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 group-hover:text-[#c20f24] transition-colors">Free Package</span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">Students do not need to purchase this package to access its videos.</span>
                  </div>
                </label>

                {!form.is_free && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Price (LKR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
                      <input type="number" className={`${inputCls} pl-10 font-bold`} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1500" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Audience</label>
                <div className="relative mb-3">
                  <select className={`${inputCls} appearance-none pr-10`} value={form.audience_scope} onChange={(e) => setForm({ ...form, audience_scope: e.target.value as any })}>
                    <option value="batches">Specific Batches</option>
                    <option value="program">Entire Program (All A/L)</option>
                    <option value="public">Public (Everyone)</option>
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {form.audience_scope === 'program' && (
                  <div className="relative animate-in fade-in slide-in-from-top-2">
                    <select className={`${inputCls} appearance-none pr-10`} value={form.audience_program} onChange={(e) => setForm({ ...form, audience_program: e.target.value })}>
                      <option value="A/L">A/L Program</option>
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                )}

                {form.audience_scope === 'batches' && (
                  <div className="animate-in fade-in slide-in-from-top-2 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto overscroll-contain shadow-inner">
                    {batches.length === 0 ? (
                      <p className="text-sm text-slate-400 p-4 text-center">No batches available.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {batches.map((b: any) => (
                          <label key={b.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group">
                            <input type="checkbox" checked={form.batch_ids.includes(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{b.name}</span>
                            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">{b.program}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlertIcon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h2 className="text-base font-bold mb-2">Publish Status</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">When published, this package will immediately be visible to the targeted students in their portal.</p>
              
              <label className="flex items-center gap-4 cursor-pointer group bg-white/10 p-4 rounded-2xl hover:bg-white/20 transition-colors">
                <div className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${form.is_published ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                  <input type="checkbox" className="sr-only" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_published ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-bold text-white tracking-wide">{form.is_published ? 'Published & Live' : 'Kept as Draft'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// 3. VIDEO MANAGER VIEW
// --------------------------------------------------------------------------------

function VideoManagerView({ pack, onNav }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vForm, setVForm] = useState({ id: '', title: '', youtube: '', duration: '', description: '', tutes: [] as any[] });
  const [tuteFiles, setTuteFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const tuteRef = useRef<HTMLInputElement>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pack_videos').select('*').eq('pack_id', pack.id).order('sort_order');
    setVideos(data ?? []);
    setLoading(false);
  }, [pack.id]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const saveVideo = async () => {
    if (!vForm.title.trim() || (!vForm.youtube.trim() && vForm.tutes.length === 0 && tuteFiles.length === 0)) return;
    setSaving(true);
    const tutes = [...vForm.tutes];
    for (const f of tuteFiles) {
      const path = `packs/${pack.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.pdf`;
      const { error: upErr } = await supabase.storage.from('tutes').upload(path, f, { upsert: true, contentType: 'application/pdf' });
      if (upErr) {
        alert(`Could not upload "${f.name}":\n${upErr.message}`);
        setSaving(false);
        return;
      }
      tutes.push({ name: f.name, url: supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl });
    }
    const payload = {
      title: vForm.title.trim(),
      youtube_id: vForm.youtube.trim() ? parseYouTubeId(vForm.youtube) : null,
      duration_label: vForm.duration || null,
      description: vForm.description || null,
      tutes
    };
    
    let error;
    if (vForm.id) {
      ({ error } = await supabase.from('pack_videos').update(payload).eq('id', vForm.id));
    } else {
      const nextOrder = videos.length ? Math.max(...videos.map((v) => v.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('pack_videos').insert({ ...payload, pack_id: pack.id, sort_order: nextOrder }));
    }

    if (error) {
      alert(`Could not save the video:\n${error.message}`);
      setSaving(false);
      return;
    }
    
    setVForm({ id: '', title: '', youtube: '', duration: '', description: '', tutes: [] });
    setTuteFiles([]);
    setMsg(`Successfully saved "${payload.title}"`);
    setTimeout(() => setMsg(''), 4000);
    setSaving(false);
    loadVideos();
  };

  const editVideo = (v: any) => {
    setVForm({
      id: v.id, title: v.title, youtube: v.youtube_id || '', duration: v.duration_label ?? '', description: v.description ?? '',
      tutes: Array.isArray(v.tutes) && v.tutes.length ? v.tutes : v.tute_url ? [{ name: 'Tute PDF', url: v.tute_url }] : []
    });
    setTuteFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteVideo = async (id: string) => {
    if (confirm('Remove this video?')) {
      await supabase.from('pack_videos').delete().eq('id', id);
      loadVideos();
    }
  };

  const moveVideo = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const a = videos[idx], b = videos[j];
    await supabase.from('pack_videos').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('pack_videos').update({ sort_order: a.sort_order }).eq('id', b.id);
    loadVideos();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <button onClick={() => onNav('list')} className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{pack.title}</h1>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">Videos</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Manage the video lessons and PDF attachments for this package.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* LEFT COL: Editor */}
        <div className="lg:col-span-2 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
              {vForm.id ? <PencilIcon className="w-5 h-5 text-blue-500" /> : <PlusIcon className="w-5 h-5 text-[#c20f24]" />}
              {vForm.id ? 'Edit Video Details' : 'Add New Video'}
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Video Title</label>
                <input className={inputCls} value={vForm.title} onChange={(e) => setVForm({ ...vForm, title: e.target.value })} placeholder="e.g. Lesson 1: Introduction" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">YouTube URL or ID</label>
                <input className={inputCls} value={vForm.youtube} onChange={(e) => setVForm({ ...vForm, youtube: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Optional)</label>
                <input className={inputCls} value={vForm.duration} onChange={(e) => setVForm({ ...vForm, duration: e.target.value })} placeholder="e.g. 1h 30m" />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Materials (PDF)</label>
                <input ref={tuteRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (picked.length) setTuteFiles((f) => [...f, ...picked]);
                  }} 
                />
                <button type="button" onClick={() => tuteRef.current?.click()} className="w-full h-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                  <UploadCloudIcon className="w-5 h-5" /> Select PDFs to attach
                </button>
                
                {(vForm.tutes.length > 0 || tuteFiles.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {vForm.tutes.map((t, i) => (
                      <div key={`s${i}`} className="flex items-center justify-between bg-slate-100 rounded-lg p-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileTextIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-700 truncate">{t.name}</span>
                        </div>
                        <button type="button" onClick={() => setVForm({ ...vForm, tutes: vForm.tutes.filter((_, j) => j !== i) })} className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {tuteFiles.map((f, i) => (
                      <div key={`q${i}`} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileTextIcon className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-sm font-medium text-blue-700 truncate">{f.name}</span>
                        </div>
                        <button type="button" onClick={() => setTuteFiles((fs) => fs.filter((_, j) => j !== i))} className="p-1 rounded-md text-blue-400 hover:bg-blue-100 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                {vForm.id && (
                  <button onClick={() => { setVForm({ id: '', title: '', youtube: '', duration: '', description: '', tutes: [] }); setTuteFiles([]); }} className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors">Cancel Edit</button>
                )}
                <button 
                  onClick={saveVideo} 
                  disabled={saving || (!vForm.title.trim() || (!vForm.youtube.trim() && vForm.tutes.length === 0 && tuteFiles.length === 0))} 
                  className={`flex-[2] h-12 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${vForm.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#c20f24] hover:bg-red-700'}`}
                >
                  {saving && <Loader2Icon className="w-4 h-4 animate-spin" />}
                  {vForm.id ? 'Update Video' : 'Add to Package'}
                </button>
              </div>
              
              {msg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2Icon className="w-4 h-4" /> {msg}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COL: Playlist */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Playlist</h3>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{videos.length} videos</span>
            </div>
            
            <div className="p-2 sm:p-4 space-y-2">
              {loading ? (
                <div className="py-12 flex justify-center"><Loader2Icon className="w-6 h-6 text-slate-300 animate-spin" /></div>
              ) : videos.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <FilmIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-900">Playlist is empty</p>
                  <p className="text-sm text-slate-500 mt-1">Use the form to add the first video to this package.</p>
                </div>
              ) : (
                videos.map((v, idx) => (
                  <div key={v.id} className={`group flex items-stretch gap-3 p-3 rounded-2xl border transition-all ${vForm.id === v.id ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}>
                    {/* Ordering Controls */}
                    <div className="flex flex-col items-center justify-center gap-1 w-8 shrink-0">
                      <button onClick={() => moveVideo(idx, -1)} disabled={idx === 0} className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUpIcon className="w-4 h-4" /></button>
                      <GripVerticalIcon className="w-3 h-3 text-slate-200" />
                      <button onClick={() => moveVideo(idx, 1)} disabled={idx === videos.length - 1} className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDownIcon className="w-4 h-4" /></button>
                    </div>

                    {/* Thumb placeholder */}
                    <div className="w-24 sm:w-32 aspect-video bg-slate-100 rounded-xl shrink-0 overflow-hidden relative flex items-center justify-center">
                      {v.youtube_id ? (
                        <img src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FilmIcon className="w-6 h-6 text-slate-300" />
                      )}
                      {v.duration_label && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded backdrop-blur-sm">{v.duration_label}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                      <p className="text-sm font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{v.title}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                        {v.youtube_id && <span className="flex items-center gap-1"><PlayCircleIcon className="w-3.5 h-3.5" /> Video</span>}
                        {(() => { 
                          const n = Array.isArray(v.tutes) && v.tutes.length ? v.tutes.length : v.tute_url ? 1 : 0; 
                          return n > 0 && <span className="flex items-center gap-1 text-blue-600"><FileTextIcon className="w-3.5 h-3.5" /> {n} PDF{n !== 1 && 's'}</span>;
                        })()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center justify-center gap-2 shrink-0 border-l border-slate-100 pl-3">
                      <button onClick={() => editVideo(v)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => deleteVideo(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2Icon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
