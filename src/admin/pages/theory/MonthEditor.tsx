import { useEffect, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Modal, Button } from '../../components/ui';
import { MONTHS, inputCls, labelCls, ImagePicker, FormError } from './kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A month's own details: when it is, what it costs, who can see it.
 *
 * This is the one thing on the Monthly Recordings screens that still opens
 * over the page, and deliberately — it is a short form you finish and
 * leave, not a place you work in. Everything you work *in* (sessions,
 * homework, papers, links) is a page of its own now.
 */

const now = new Date();

export type MonthForm = {
  month: string;
  year: string;
  price: string;
  topics: string;
  audience_scope: 'batches' | 'program' | 'public';
  audience_program: string;
  batch_ids: string[];
  is_published: boolean;
  thumbnail_url: string;
};

export const emptyMonthForm: MonthForm = {
  month: MONTHS[now.getMonth()],
  year: String(now.getFullYear()),
  price: '',
  topics: '',
  audience_scope: 'batches',
  audience_program: 'A/L',
  batch_ids: [],
  is_published: false,
  thumbnail_url: ''
};

export function monthToForm(m: any): MonthForm {
  return {
    month: m.month,
    year: String(m.year),
    price: m.price != null ? String(m.price) : '',
    topics: (m.topics ?? []).join(', '),
    audience_scope: m.audience_scope ?? 'batches',
    audience_program: m.audience_program ?? 'A/L',
    batch_ids: m.batch_ids ?? [],
    is_published: m.is_published ?? false,
    thumbnail_url: m.thumbnail_url ?? ''
  };
}

export function MonthEditor({
  open,
  editing,
  batches,
  onClose,
  onSaved
}: {
  open: boolean;
  /** The month being edited, or null to create a new one. */
  editing: any | null;
  batches: any[];
  onClose: () => void;
  onSaved: (monthId?: string) => void;
}) {
  const [form, setForm] = useState<MonthForm>(emptyMonthForm);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing ? monthToForm(editing) : emptyMonthForm);
    setThumbFile(null);
    setThumbPreview(editing?.thumbnail_url ?? undefined);
    setErr('');
  }, [open, editing]);

  const pickThumb = (f: File) => {
    setThumbFile(f);
    const r = new FileReader();
    r.onload = () => setThumbPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const toggleBatch = (id: string) =>
    setForm((f) => ({
      ...f,
      batch_ids: f.batch_ids.includes(id) ? f.batch_ids.filter((x) => x !== id) : [...f.batch_ids, id]
    }));

  const save = async () => {
    setSaving(true);
    setErr('');

    let thumbUrl: string | null = form.thumbnail_url || null;
    if (thumbFile) {
      const ext = thumbFile.name.split('.').pop() || 'jpg';
      const path = `theory/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('thumbnails').upload(path, thumbFile, { upsert: true });
      if (error) {
        setSaving(false);
        setErr(`The image would not upload.\n${error.message}`);
        return;
      }
      thumbUrl = supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      month: form.month,
      year: Number(form.year),
      price: form.price ? Number(form.price) : 0,
      topics: form.topics ? form.topics.split(',').map((t) => t.trim()).filter(Boolean) : [],
      audience_scope: form.audience_scope,
      audience_program: form.audience_scope === 'program' ? form.audience_program : null,
      batch_ids: form.audience_scope === 'batches' ? form.batch_ids : [],
      is_published: form.is_published,
      thumbnail_url: thumbUrl
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

    setSaving(false);
    if (error) {
      setErr(`The month would not save.\n${error.message}`);
      return;
    }
    onSaved(monthId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `${editing.month} ${editing.year}` : 'New month'}
      description={editing ? 'Change when this month is, what it costs and who can see it.' : 'Set it up now — sessions and sheets go in afterwards.'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving && <Loader2Icon className="w-4 h-4 animate-spin" />}
            {editing ? 'Save changes' : 'Create month'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ImagePicker preview={thumbPreview} onPick={pickThumb} />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Month</label>
            <select className={inputCls} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Price (Rs.)</label>
            <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="4500" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Topics</label>
          <input
            className={inputCls}
            value={form.topics}
            onChange={(e) => setForm({ ...form, topics: e.target.value })}
            placeholder="Networking, Databases, Past paper"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">Separate them with commas. Students see these on the month's card.</p>
        </div>

        <div>
          <label className={labelCls}>Who can see it</label>
          <select
            className={inputCls}
            value={form.audience_scope}
            onChange={(e) => setForm({ ...form, audience_scope: e.target.value as MonthForm['audience_scope'] })}
          >
            <option value="batches">Specific batches</option>
            <option value="program">A whole program</option>
            <option value="public">Everyone</option>
          </select>

          {form.audience_scope === 'program' && (
            <select
              className={`${inputCls} mt-2`}
              value={form.audience_program}
              onChange={(e) => setForm({ ...form, audience_program: e.target.value })}
            >
              <option value="A/L">All A/L</option>
            </select>
          )}

          {form.audience_scope === 'batches' && (
            <div className="mt-2 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto" data-lenis-prevent>
              {batches.length === 0 && <p className="text-[13px] text-slate-400 px-3.5 py-3">No batches yet.</p>}
              {batches.map((b) => (
                <label key={b.id} className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.batch_ids.includes(b.id)}
                    onChange={() => toggleBatch(b.id)}
                    className="w-4 h-4 rounded accent-[#c20f24]"
                  />
                  <span className="text-[13px] text-slate-700">{b.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            className="w-4 h-4 rounded accent-[#c20f24] mt-0.5"
          />
          <span>
            <span className="block text-[13px] font-semibold text-slate-900">Publish it</span>
            <span className="block text-[12px] text-slate-500">Students who have paid for this month see it straight away.</span>
          </span>
        </label>

        <FormError>{err}</FormError>
      </div>
    </Modal>
  );
}
