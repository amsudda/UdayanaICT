import { useEffect, useState, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  UploadCloudIcon,
  Loader2Icon,
  FileTextIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  MapPinIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  AlertTriangleIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  PageHeader, Button, SearchInput, FilterTabs, StatusPill,
  EmptyState, Panel, Modal
} from '../components/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40';

type PaperType = 'past_paper' | 'provincial_paper' | 'model_paper';
type Tab = 'all' | PaperType;
type Shelf = 'all' | 'published' | 'draft' | 'noscheme';

const TYPES: { key: PaperType; label: string; short: string; tint: string }[] = [
  { key: 'past_paper', label: 'Past papers', short: 'Past', tint: 'bg-blue-50 text-blue-600' },
  { key: 'provincial_paper', label: 'Provincial papers', short: 'Provincial', tint: 'bg-violet-50 text-violet-600' },
  { key: 'model_paper', label: 'Model papers', short: 'Model', tint: 'bg-emerald-50 text-emerald-600' }
];

const typeOf = (k: string) => TYPES.find((t) => t.key === k) ?? TYPES[2];

const PROVINCES = [
  'Western Province', 'Southern Province', 'Central Province', 'Northern Province',
  'Eastern Province', 'North Western Province', 'North Central Province',
  'Uva Province', 'Sabaragamuwa Province'
];

const emptyForm = {
  title: '',
  description: '',
  pdf_url: '',
  paper_type: 'past_paper' as PaperType,
  year: new Date().getFullYear(),
  province: '',
  marking_scheme_url: '',
  audience_scope: 'batches' as 'public' | 'program' | 'batches',
  batch_ids: [] as string[],
  audience_program: 'A/L' as 'O/L' | 'A/L',
  is_published: false
};

export function AdminPapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [markingFile, setMarkingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const markingRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [shelf, setShelf] = useState<Shelf>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, bRes] = await Promise.all([
      supabase.from('papers').select('*').order('created_at', { ascending: false }),
      supabase.from('batches').select('*').order('created_at', { ascending: false })
    ]);
    setPapers(pRes.data ?? []);
    setBatches(bRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setPdfFile(null); setMarkingFile(null); setEditorOpen(true); };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title ?? '',
      description: p.description ?? '',
      pdf_url: p.pdf_url ?? '',
      paper_type: p.paper_type ?? 'model_paper',
      year: p.year ?? new Date().getFullYear(),
      province: p.province ?? '',
      marking_scheme_url: p.marking_scheme_url ?? '',
      audience_scope: p.audience_scope ?? 'batches',
      batch_ids: p.batch_ids ?? [],
      audience_program: p.audience_program ?? 'A/L',
      is_published: p.is_published ?? false
    });
    setPdfFile(null);
    setMarkingFile(null);
    setEditorOpen(true);
  };

  const onPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPdfFile(f);
  };

  const onMarking = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setMarkingFile(f);
  };

  const toggleBatch = (id: string) => {
    setForm((f) => ({ ...f, batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter((x) => x !== id) : [...f.batch_ids, id] }));
  };

  const save = async () => {
    if (!form.title.trim()) return alert('Title is required.');
    if (!pdfFile && !form.pdf_url) return alert('Please upload a PDF.');

    setSaving(true);
    let finalPdfUrl = form.pdf_url;
    let finalMarkingUrl = form.marking_scheme_url;

    if (pdfFile) {
      const ext = pdfFile.name.split('.').pop() || 'pdf';
      const path = `papers/q_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('tutes').upload(path, pdfFile, { upsert: true, contentType: 'application/pdf' });
      if (upErr) {
        setSaving(false);
        return alert(`Could not upload PDF: ${upErr.message}`);
      }
      finalPdfUrl = supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl;
    }

    if (markingFile) {
      const ext = markingFile.name.split('.').pop() || 'pdf';
      const path = `papers/m_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('tutes').upload(path, markingFile, { upsert: true, contentType: 'application/pdf' });
      if (upErr) {
        setSaving(false);
        return alert(`Could not upload Marking Scheme: ${upErr.message}`);
      }
      finalMarkingUrl = supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      pdf_url: finalPdfUrl,
      paper_type: form.paper_type,
      year: form.paper_type === 'past_paper' || form.paper_type === 'model_paper' ? form.year : null,
      province: form.paper_type === 'provincial_paper' ? form.province.trim() : null,
      marking_scheme_url: finalMarkingUrl || null,
      audience_scope: form.audience_scope,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      is_published: form.is_published
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('papers').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('papers').insert(payload));
    }

    setSaving(false);
    if (error) return alert(`Could not save paper: ${error.message}`);
    setEditorOpen(false);
    load();
  };

  /** Publishing is one click from the card — it was buried in the editor. */
  const togglePublish = async (p: any) => {
    setBusyId(p.id);
    await supabase.from('papers').update({ is_published: !p.is_published }).eq('id', p.id);
    setBusyId(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('papers').delete().eq('id', deleteTarget.id);
    if (error) alert(`Could not delete paper: ${error.message}`);
    setDeleteTarget(null);
    load();
  };

  /* ── derived ── */
  const counts = useMemo(() => ({
    total: papers.length,
    published: papers.filter((p) => p.is_published).length,
    draft: papers.filter((p) => !p.is_published).length,
    noscheme: papers.filter((p) => !p.marking_scheme_url).length,
    byType: Object.fromEntries(TYPES.map((t) => [t.key, papers.filter((p) => p.paper_type === t.key).length]))
  }), [papers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return papers.filter((p) => {
      if (tab !== 'all' && p.paper_type !== tab) return false;
      if (shelf === 'published' && !p.is_published) return false;
      if (shelf === 'draft' && p.is_published) return false;
      if (shelf === 'noscheme' && p.marking_scheme_url) return false;
      if (!q) return true;
      return [p.title, p.description, p.province, p.year].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [papers, query, tab, shelf]);

  const audienceOf = (p: any) => {
    if (p.audience_scope === 'public') return 'Everyone';
    if (p.audience_scope === 'program') return `All ${p.audience_program ?? 'A/L'} students`;
    const names = (p.batch_ids ?? [])
      .map((id: string) => batches.find((b) => b.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return 'No batch chosen';
    if (names.length <= 2) return names.join(' · ');
    return `${names.slice(0, 2).join(' · ')} +${names.length - 2}`;
  };

  const shelves = [
    { key: 'all' as Shelf, label: 'Papers', value: counts.total, sub: 'uploaded', icon: FileTextIcon, tint: 'bg-blue-50 text-blue-600' },
    { key: 'published' as Shelf, label: 'Published', value: counts.published, sub: 'students can see', icon: EyeIcon, tint: 'bg-emerald-50 text-emerald-600' },
    { key: 'draft' as Shelf, label: 'Drafts', value: counts.draft, sub: 'hidden for now', icon: EyeOffIcon, tint: 'bg-slate-100 text-slate-500' },
    {
      key: 'noscheme' as Shelf,
      label: 'No scheme',
      value: counts.noscheme,
      sub: counts.noscheme ? 'answers missing' : 'all complete',
      icon: AlertTriangleIcon,
      tint: counts.noscheme ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academic"
        title="Papers"
        description="Question papers and marking schemes, and who each one reaches."
        actions={<Button icon={PlusIcon} onClick={openCreate}>New paper</Button>}
      />

      {/* ── The shelf, in four numbers. Each one filters. ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {shelves.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setShelf(s.key)}
            className={`rise-in rounded-2xl border bg-white p-4 flex items-center gap-3 text-left transition-colors ${
              shelf === s.key ? 'border-[#c20f24]/40 ring-2 ring-[#c20f24]/10' : 'border-slate-200 hover:border-slate-300'
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[22px] font-bold text-slate-900 leading-none tabular-nums">{s.value}</p>
              <p className="text-[12px] text-slate-500 mt-1 truncate">
                <span className="font-semibold text-slate-600">{s.label}</span> · {s.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by title, year or province" className="sm:max-w-sm w-full" />
        <div className="flex items-center gap-2 flex-wrap">
          <FilterTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: `All (${counts.total})` },
              ...TYPES.map((t) => ({ value: t.key as Tab, label: `${t.short} (${counts.byType[t.key] ?? 0})` }))
            ]}
          />
          {(query || tab !== 'all' || shelf !== 'all') && (
            <button
              onClick={() => { setQuery(''); setTab('all'); setShelf('all'); }}
              className="h-10 px-3 rounded-xl text-[13px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Papers ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={FileTextIcon}
            title={papers.length === 0 ? 'No papers yet' : 'Nothing matches those filters'}
            description={
              papers.length === 0
                ? 'Upload a question paper, add its marking scheme, and choose which batches get it.'
                : 'Try a different search, or clear the filters above.'
            }
            action={papers.length === 0 ? <Button icon={PlusIcon} onClick={openCreate}>Upload a paper</Button> : undefined}
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p, i) => {
            const t = typeOf(p.paper_type);
            return (
              <article
                key={p.id}
                className="rise-in group rounded-2xl border border-slate-200 bg-white p-5 flex flex-col hover:border-slate-300 transition-colors"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${t.tint}`}>{t.short}</span>
                  {p.is_published
                    ? <StatusPill tone="green">Published</StatusPill>
                    : <StatusPill tone="slate">Draft</StatusPill>}
                </div>

                <h3 className="font-bold text-slate-900 text-[16px] leading-snug mt-3 line-clamp-2" title={p.title}>
                  {p.title}
                </h3>

                <p className="flex items-center gap-3 text-[12px] text-slate-500 mt-1.5">
                  {p.year && <span className="inline-flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {p.year}</span>}
                  {p.province && <span className="inline-flex items-center gap-1 truncate"><MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {p.province}</span>}
                </p>

                {p.description && <p className="text-[13px] text-slate-500 line-clamp-2 mt-2">{p.description}</p>}

                {/* the two files, and plainly when one is missing */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.pdf_url ? (
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <FileTextIcon className="w-3.5 h-3.5" /> Question paper
                      <ExternalLinkIcon className="w-3 h-3 text-slate-400" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                      <AlertTriangleIcon className="w-3.5 h-3.5" /> No paper file
                    </span>
                  )}

                  {p.marking_scheme_url ? (
                    <a
                      href={p.marking_scheme_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <ClipboardCheckIcon className="w-3.5 h-3.5" /> Marking scheme
                      <ExternalLinkIcon className="w-3 h-3 text-emerald-500" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                      No marking scheme
                    </span>
                  )}
                </div>

                {/* who gets it — names, not a count */}
                <p className="text-[12px] text-slate-500 mt-3 truncate" title={audienceOf(p)}>
                  <span className="font-semibold text-slate-600">Seen by:</span> {audienceOf(p)}
                </p>

                <div className="flex items-center gap-1 mt-auto pt-4 border-t border-slate-100">
                  <button
                    onClick={() => togglePublish(p)}
                    disabled={busyId === p.id}
                    className={`flex-1 h-9 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] duration-150 disabled:opacity-50 ${
                      p.is_published
                        ? 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                        : 'bg-[#c20f24] text-white hover:bg-[#a60d1f]'
                    }`}
                  >
                    {busyId === p.id
                      ? <Loader2Icon className="w-4 h-4 animate-spin" />
                      : p.is_published ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    {p.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    title="Edit paper"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors active:scale-95 duration-150"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    title="Delete paper"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors active:scale-95 duration-150"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Editor ── */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editing ? 'Edit paper' : 'New paper'}
        description={editing ? editing.title : 'A PDF students can open, and optionally its marking scheme.'}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setEditorOpen(false)}
              className="flex-1 h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.98] duration-150"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.title.trim()}
              className="flex-1 h-11 rounded-xl bg-[#c20f24] text-white font-semibold hover:bg-[#a60d1f] disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] duration-150"
            >
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add paper'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. 2026 Model Paper 1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Type</label>
              <select value={form.paper_type} onChange={(e) => setForm({ ...form, paper_type: e.target.value as PaperType })} className={inputCls}>
                <option value="past_paper">Past paper</option>
                <option value="provincial_paper">Provincial paper</option>
                <option value="model_paper">Model paper</option>
              </select>
            </div>

            {(form.paper_type === 'past_paper' || form.paper_type === 'model_paper') && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Year</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className={inputCls}
                  placeholder="e.g. 2024"
                />
              </div>
            )}

            {form.paper_type === 'provincial_paper' && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">Province</label>
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inputCls}>
                  <option value="">Choose a province…</option>
                  {PROVINCES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputCls} h-20 py-2.5 resize-none`}
              placeholder="Anything students should know before they open it…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Question paper PDF</label>
              <input type="file" accept="application/pdf" className="hidden" ref={pdfRef} onChange={onPdf} />
              <button
                onClick={() => pdfRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 text-slate-600 text-sm font-medium hover:border-[#c20f24]/40 hover:bg-red-50/40 transition-colors"
              >
                <UploadCloudIcon className="w-4 h-4" /> {pdfFile || form.pdf_url ? 'Replace paper' : 'Upload paper'}
              </button>
              {(pdfFile || form.pdf_url) && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5 truncate">
                  <CheckCircle2Icon className="w-3 h-3 shrink-0" /> {pdfFile ? pdfFile.name : 'PDF in place'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Marking scheme PDF</label>
              <input type="file" accept="application/pdf" className="hidden" ref={markingRef} onChange={onMarking} />
              <button
                onClick={() => markingRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 text-slate-600 text-sm font-medium hover:border-[#c20f24]/40 hover:bg-red-50/40 transition-colors"
              >
                <UploadCloudIcon className="w-4 h-4" /> {markingFile || form.marking_scheme_url ? 'Replace scheme' : 'Upload scheme'}
              </button>
              {(markingFile || form.marking_scheme_url) && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5 truncate">
                  <CheckCircle2Icon className="w-3 h-3 shrink-0" /> {markingFile ? markingFile.name : 'Scheme in place'}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-semibold text-slate-900 mb-3">Who can see this?</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              {(['batches', 'program', 'public'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, audience_scope: s })}
                  className={`flex-1 text-sm font-semibold h-9 rounded-lg transition-colors ${
                    form.audience_scope === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {s === 'batches' ? 'Chosen batches' : s === 'program' ? 'A whole program' : 'Everyone'}
                </button>
              ))}
            </div>

            {form.audience_scope === 'program' && (
              <div className="flex gap-4 mb-2">
                {(['O/L', 'A/L'] as const).map((pr) => (
                  <label key={pr} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="aud_prog"
                      checked={form.audience_program === pr}
                      onChange={() => setForm({ ...form, audience_program: pr })}
                      className="w-4 h-4 accent-[#c20f24]"
                    />
                    <span className="text-sm text-slate-700">{pr} students</span>
                  </label>
                ))}
              </div>
            )}

            {form.audience_scope === 'batches' && (
              <>
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {batches.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No batches yet — create one first.</p>
                  ) : batches.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.batch_ids.includes(b.id)}
                        onChange={() => toggleBatch(b.id)}
                        className="w-4 h-4 rounded accent-[#c20f24]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{b.name}</p>
                        <p className="text-xs text-slate-500">{[b.program, b.exam_year, b.medium].filter(Boolean).join(' · ')}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.batch_ids.length === 0 && batches.length > 0 && (
                  <p className="text-[12px] text-amber-600 mt-2">Pick at least one batch, or nobody will see this paper.</p>
                )}
              </>
            )}
          </div>

          <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded accent-[#c20f24]"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Publish straight away</span>
              <span className="block text-[12px] text-slate-500">Leave it off to keep the paper as a draft. You can publish from the card later.</span>
            </span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.title ?? 'this paper'}?`}
        message="The paper and its marking scheme stop being available to students. This cannot be undone."
        confirmLabel="Delete paper"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
