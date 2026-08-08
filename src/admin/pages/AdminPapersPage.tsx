import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  UploadCloudIcon,
  Loader2Icon,
  FileTextIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500';

const emptyForm = {
  title: '',
  description: '',
  pdf_url: '',
  paper_type: 'past_paper' as 'past_paper' | 'provincial_paper' | 'model_paper',
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
  const pdfRef = useRef<HTMLInputElement>(null);
  const markingRef = useRef<HTMLInputElement>(null);

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
    setForm(f => ({ ...f, batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter(x => x !== id) : [...f.batch_ids, id] }));
  };

  const save = async () => {
    if (!form.title.trim()) return alert("Title is required.");
    if (!pdfFile && !form.pdf_url) return alert("Please upload a PDF.");

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
    if (error) {
      return alert(`Could not save paper: ${error.message}`);
    }
    setEditorOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('papers').delete().eq('id', deleteTarget.id);
    if (error) {
      alert(`Could not delete paper: ${error.message}`);
    }
    setDeleteTarget(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Papers</h1>
          <p className="text-sm text-slate-500 mt-1">Upload PDF papers for students.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New Paper
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500"><Loader2Icon className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : papers.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 bg-white">
          <FileTextIcon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No papers uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {p.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{p.description}</p>}
              
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                <span className={`px-2 py-1 rounded-md ${p.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {p.is_published ? 'Published' : 'Draft'}
                </span>
                <span className="text-slate-500">
                  {p.audience_scope === 'public' ? 'Public' : p.audience_scope === 'program' ? `All ${p.audience_program}` : `${p.batch_ids?.length || 0} Batches`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? "Edit Paper" : "New Paper"}>
        <div className="space-y-5 p-1">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. 2026 Model Paper 1" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Paper Type</label>
            <select value={form.paper_type} onChange={e => setForm({ ...form, paper_type: e.target.value as any })} className={inputCls}>
              <option value="past_paper">Past Paper</option>
              <option value="provincial_paper">Provincial Paper</option>
              <option value="model_paper">Model Paper</option>
            </select>
          </div>

          {(form.paper_type === 'past_paper' || form.paper_type === 'model_paper') && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Year</label>
              <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })} className={inputCls} placeholder="e.g. 2024" />
            </div>
          )}

          {form.paper_type === 'provincial_paper' && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Province</label>
              <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} className={inputCls}>
                <option value="">Select Province...</option>
                <option value="Western Province">Western Province</option>
                <option value="Southern Province">Southern Province</option>
                <option value="Central Province">Central Province</option>
                <option value="Northern Province">Northern Province</option>
                <option value="Eastern Province">Eastern Province</option>
                <option value="North Western Province">North Western Province</option>
                <option value="North Central Province">North Central Province</option>
                <option value="Uva Province">Uva Province</option>
                <option value="Sabaragamuwa Province">Sabaragamuwa Province</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Description (Optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20 py-2.5 resize-none`} placeholder="Brief description..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Question Paper PDF</label>
              <input type="file" accept="application/pdf" className="hidden" ref={pdfRef} onChange={onPdf} />
              <button onClick={() => pdfRef.current?.click()} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                <UploadCloudIcon className="w-4 h-4" /> {pdfFile || form.pdf_url ? 'Change Paper' : 'Upload Paper'}
              </button>
              {(pdfFile || form.pdf_url) && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1 truncate"><CheckCircle2Icon className="w-3 h-3 shrink-0" /> {pdfFile ? pdfFile.name : 'PDF Uploaded'}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Marking Scheme PDF</label>
              <input type="file" accept="application/pdf" className="hidden" ref={markingRef} onChange={onMarking} />
              <button onClick={() => markingRef.current?.click()} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                <UploadCloudIcon className="w-4 h-4" /> {markingFile || form.marking_scheme_url ? 'Change Scheme' : 'Upload Scheme'}
              </button>
              {(markingFile || form.marking_scheme_url) && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1 truncate"><CheckCircle2Icon className="w-3 h-3 shrink-0" /> {markingFile ? markingFile.name : 'Scheme Uploaded'}</span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-semibold text-slate-900 mb-3">Who can see this?</label>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              {(['batches', 'program', 'public'] as const).map(s => (
                <button key={s} onClick={() => setForm({ ...form, audience_scope: s })} className={`flex-1 text-sm font-medium h-9 rounded-lg transition-colors ${form.audience_scope === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {s === 'batches' ? 'Specific Batches' : s === 'program' ? 'By Program' : 'Public'}
                </button>
              ))}
            </div>

            {form.audience_scope === 'program' && (
              <div className="flex gap-3 mb-4">
                {(['O/L', 'A/L'] as const).map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="aud_prog" checked={form.audience_program === p} onChange={() => setForm({ ...form, audience_program: p })} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm text-slate-700">{p} Students</span>
                  </label>
                ))}
              </div>
            )}

            {form.audience_scope === 'batches' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl max-h-[200px] overflow-y-auto">
                {batches.length === 0 ? <div className="p-4 text-sm text-slate-500">No batches created yet.</div> : batches.map(b => (
                  <label key={b.id} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-100 cursor-pointer">
                    <input type="checkbox" checked={form.batch_ids.includes(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded accent-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-500">{b.program} {b.grade ? `Grade ${b.grade}` : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="w-5 h-5 rounded accent-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Publish this paper</p>
              <p className="text-xs text-slate-500">Uncheck to keep it hidden as a draft.</p>
            </div>
          </label>

          <button onClick={save} disabled={saving} className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2Icon className="w-4 h-4 animate-spin" />} Save Paper
          </button>
        </div>
      </Drawer>

      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Delete Paper"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Yes, delete it"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
