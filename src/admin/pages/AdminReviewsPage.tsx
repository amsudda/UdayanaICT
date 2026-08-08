import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  StarIcon,
  UploadCloudIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MessageSquareQuoteIcon,
  MonitorIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ReviewCard } from '../../components/shared/ReviewCard';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const emptyForm = {
  name: '',
  school: '',
  grade: 'A සාමාර්ථය',
  stars: 5,
  quote: '',
  exam_year: '',
  avatar_url: '' as string | null,
  is_visible: true
};

const COUNT_OPTIONS = [3, 6, 9, 12];

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCount, setShowCount] = useState(6);
  const [savingCount, setSavingCount] = useState(false);

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
    const [{ data: rs }, { data: st }] = await Promise.all([
      supabase.from('reviews').select('*').order('sort_order').order('created_at', { ascending: false }),
      supabase.from('settings').select('landing_review_count').eq('id', 1).single()
    ]);
    setReviews(rs ?? []);
    if (st?.landing_review_count != null) setShowCount(st.landing_review_count);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveCount = async (n: number) => {
    setShowCount(n);
    setSavingCount(true);
    await supabase.from('settings').update({ landing_review_count: n }).eq('id', 1);
    setSavingCount(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImgFile(null); setImgPreview(undefined); setEditorOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name ?? '', school: r.school ?? '', grade: r.grade ?? '',
      stars: r.stars ?? 5, quote: r.quote ?? '', exam_year: r.exam_year ?? '',
      avatar_url: r.avatar_url ?? '', is_visible: r.is_visible ?? true
    });
    setImgFile(null);
    setImgPreview(r.avatar_url ?? undefined);
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
    if (!form.name.trim() || !form.quote.trim()) return;
    setSaving(true);
    let avatarUrl = form.avatar_url;
    if (imgFile) {
      const ext = imgFile.name.split('.').pop() || 'jpg';
      const path = `reviews/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, imgFile, { upsert: true });
      if (!error) avatarUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      name: form.name.trim(),
      school: form.school.trim() || null,
      grade: form.grade.trim() || null,
      stars: form.stars,
      quote: form.quote.trim(),
      exam_year: form.exam_year.trim() || null,
      avatar_url: avatarUrl || null,
      is_visible: form.is_visible
    };
    if (editing) await supabase.from('reviews').update(payload).eq('id', editing.id);
    else await supabase.from('reviews').insert({ ...payload, sort_order: reviews.length });
    setSaving(false);
    setEditorOpen(false);
    load();
  };

  const toggleVisible = async (r: any) => {
    await supabase.from('reviews').update({ is_visible: !r.is_visible }).eq('id', r.id);
    load();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= reviews.length) return;
    const a = reviews[idx], b = reviews[j];
    await supabase.from('reviews').update({ sort_order: b.sort_order ?? j }).eq('id', a.id);
    await supabase.from('reviews').update({ sort_order: a.sort_order ?? idx }).eq('id', b.id);
    load();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('reviews').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const toCard = (r: any) => ({
    id: r.id, name: r.name, school: r.school, grade: r.grade,
    stars: r.stars ?? 5, quote: r.quote, year: r.exam_year, avatar: r.avatar_url
  });

  const visible = reviews.filter((r) => r.is_visible);
  const landing = visible.slice(0, showCount);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New review
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Student testimonials shown in the landing page "සිසුන්ගේ අදහස්" section. Toggle the eye to choose which ones appear.</p>

      {/* how many to show */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <p className="text-sm font-semibold text-slate-700 mr-1">Show on landing page:</p>
        {COUNT_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => saveCount(n)}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${showCount === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {savingCount ? 'Saving…' : `${Math.min(showCount, visible.length)} of ${visible.length} visible review${visible.length === 1 ? '' : 's'} will appear`}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <MessageSquareQuoteIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No reviews yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your students' testimonials — the landing page reviews section stays hidden until at least one is visible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r, idx) => (
            <div key={r.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUpIcon className="w-4 h-4" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === reviews.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDownIcon className="w-4 h-4" /></button>
              </div>
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                  {(r.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{r.name}</p>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: r.stars ?? 5 }).map((_, i) => <StarIcon key={i} className="w-3 h-3 fill-current" />)}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${r.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                  {r.is_visible && visible.indexOf(r) >= showCount && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700" title="Visible but beyond the show count">
                      Over limit
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{[r.school, r.grade, r.exam_year].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleVisible(r)} title={r.is_visible ? 'Hide from landing' : 'Show on landing'} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  {r.is_visible ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteTarget(r)} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2Icon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── landing page preview — renders the exact same cards visitors see ── */}
      {!loading && landing.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <MonitorIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Landing page preview</h2>
            <span className="text-xs text-slate-400">— exactly how the "සිසුන්ගේ අදහස්" section will look</span>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-red-50/50 to-white p-6 sm:p-10">
            <div className="text-center mb-10">
              <span className="inline-block py-1.5 px-4 rounded-full bg-red-50 text-[#c20f24] font-medium text-sm mb-4 border border-red-100">
                සිසුන්ගේ අදහස්
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-apple-text mb-3">අපගේ සිසුන් පවසන දේ</h2>
              <p className="text-base text-apple-subtext max-w-xl mx-auto">
                Pasindu Dissanayake හරහා A/L තොරතුරු තාක්ෂණය ජය ගත් සිසුන් ගේ අත්දැකීම්
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {landing.map((r) => <ReviewCard key={r.id} review={toCard(r)} />)}
            </div>
          </div>
        </div>
      )}

      {/* editor */}
      <Drawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit review' : 'New review'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditorOpen(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving || !form.name.trim() || !form.quote.trim()} className="flex-1 h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* live card preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Card preview</label>
            <div className="max-w-sm">
              <ReviewCard
                review={{
                  name: form.name || 'සිසුවාගේ නම',
                  school: form.school || 'පාසල',
                  grade: form.grade,
                  stars: form.stars,
                  quote: form.quote || 'Review text…',
                  year: form.exam_year,
                  avatar: imgPreview ?? null
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Student name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. කවිෂ්කා පෙරේරා" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Review text *</label>
            <textarea rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="What the student said about the class…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">School</label>
              <input className={inputCls} value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="ආනන්ද විද්‍යාලය, කොළඹ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam year</label>
              <input className={inputCls} value={form.exam_year} onChange={(e) => setForm({ ...form, exam_year: e.target.value })} placeholder="2024 A/L" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grade badge</label>
              <input className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="A සාමාර්ථය" />
              <p className="text-[11px] text-slate-400 mt-1">Colour comes from the first letter: A = green, B = blue, C = amber.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Stars</label>
              <div className="flex items-center gap-1 h-11">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, stars: n })} className="p-0.5">
                    <StarIcon className={`w-6 h-6 ${n <= form.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* avatar upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Photo (optional)</label>
            <input ref={imgRef} type="file" accept="image/*" className="sr-only" onChange={onImg} />
            <button type="button" onClick={() => imgRef.current?.click()} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium">
              <UploadCloudIcon className="w-4 h-4" /> {imgPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-[11px] text-slate-400 mt-1">Square photo works best. Without one, the student's initials are shown.</p>
          </div>

          <label className="flex items-center gap-3 pt-1">
            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-slate-700">Visible on landing page</span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}'s review?`}
        message="This removes the review permanently."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
