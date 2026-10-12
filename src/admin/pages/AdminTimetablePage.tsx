import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  Clock3Icon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  MonitorPlayIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Drawer } from '../components/Drawer';

type TimetableEntry = {
  id: string;
  exam_year: number;
  venue_name: string;
  location: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note: string | null;
  registration_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const DAYS = [
  { value: 0, label: 'Sunday', si: 'ඉරිදා' },
  { value: 1, label: 'Monday', si: 'සඳුදා' },
  { value: 2, label: 'Tuesday', si: 'අඟහරුවාදා' },
  { value: 3, label: 'Wednesday', si: 'බදාදා' },
  { value: 4, label: 'Thursday', si: 'බ්‍රහස්පතින්දා' },
  { value: 5, label: 'Friday', si: 'සිකුරාදා' },
  { value: 6, label: 'Saturday', si: 'සෙනසුරාදා' },
] as const;

const inputCls = 'w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20 focus-visible:border-[#c20f24]/50';

const freshForm = () => ({
  exam_year: new Date().getFullYear() + 2,
  venue_name: '',
  location: '',
  day_of_week: 1,
  start_time: '10:00',
  end_time: '12:00',
  note: '',
  registration_url: '',
  is_active: true,
});

function formatTime(value: string) {
  const [hourValue = '0', minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function AdminTimetablePage() {
  const [items, setItems] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(freshForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('class_timetable')
      .select('*')
      .eq('class_mode', 'online')
      .order('exam_year', { ascending: false })
      .order('day_of_week')
      .order('start_time')
      .order('sort_order');

    if (loadError) {
      setError('The timetable table is not ready yet. Run supabase/migration_class_timetable.sql, then refresh this page.');
      setItems([]);
    } else {
      setItems((data ?? []) as TimetableEntry[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => new Set(items.map((item) => item.exam_year)).size, [items]);
  const visibleCount = useMemo(() => items.filter((item) => item.is_active).length, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(freshForm());
    setEditorOpen(true);
  };

  const openEdit = (item: TimetableEntry) => {
    setEditing(item);
    setForm({
      exam_year: item.exam_year,
      venue_name: item.venue_name,
      location: item.location ?? '',
      day_of_week: item.day_of_week,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      note: item.note ?? '',
      registration_url: item.registration_url ?? '',
      is_active: item.is_active,
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.venue_name.trim() || !form.exam_year) return;
    setSaving(true);
    setError('');

    const payload = {
      exam_year: Number(form.exam_year),
      venue_name: form.venue_name.trim(),
      location: form.location.trim() || null,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      class_mode: 'online',
      note: form.note.trim() || null,
      registration_url: form.registration_url.trim() || null,
      is_active: form.is_active,
    };

    const result = editing
      ? await supabase.from('class_timetable').update(payload).eq('id', editing.id)
      : await supabase.from('class_timetable').insert({ ...payload, sort_order: items.length });

    if (result.error) {
      setError(`Could not save this class: ${result.error.message}`);
    } else {
      setEditorOpen(false);
      await load();
    }
    setSaving(false);
  };

  const toggleActive = async (item: TimetableEntry) => {
    const { error: toggleError } = await supabase
      .from('class_timetable')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (toggleError) setError(`Could not update visibility: ${toggleError.message}`);
    else load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error: deleteError } = await supabase.from('class_timetable').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    if (deleteError) setError(`Could not delete this class: ${deleteError.message}`);
    else load();
  };

  return (
    <div>
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#c20f24]">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            Landing page
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950">Class timetable</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Manage the recurring weekly schedule shown publicly. Changes appear on the landing page immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c20f24] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#a60d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/40 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Add class
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm">
        <span className="text-slate-500"><strong className="mr-1.5 text-slate-950">{items.length}</strong> total classes</span>
        <span className="text-slate-500"><strong className="mr-1.5 text-emerald-600">{visibleCount}</strong> visible</span>
        <span className="text-slate-500"><strong className="mr-1.5 text-slate-950">{years}</strong> exam years</span>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
          <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading timetable…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold text-slate-800">No classes added yet</p>
          <p className="mt-1 text-sm text-slate-400">Add the first weekly class to publish the timetable.</p>
          <button type="button" onClick={openCreate} className="mt-5 text-sm font-bold text-[#c20f24] hover:text-[#a60d1f]">Add first class</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[90px_1.15fr_1fr_100px] gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 md:grid">
            <span>Year</span>
            <span>Class</span>
            <span>Schedule</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const day = DAYS[item.day_of_week] ?? DAYS[0];
              return (
                <div key={item.id} className={`grid gap-4 px-4 py-4 sm:px-5 md:grid-cols-[90px_1.15fr_1fr_100px] md:items-center ${item.is_active ? '' : 'bg-slate-50/60 opacity-65'}`}>
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">{item.exam_year} A/L</span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.venue_name}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-400">
                      <MonitorPlayIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                      {item.location || 'Online'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{day.label} <span className="font-medium text-slate-400">· {day.si}</span></p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-slate-500">
                      <Clock3Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatTime(item.start_time)} — {formatTime(item.end_time)}
                    </p>
                  </div>

                  <div className="flex items-center justify-start gap-1 md:justify-end">
                    <span className={`mr-1 h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.is_active ? 'Visible' : 'Hidden'} />
                    <button type="button" onClick={() => toggleActive(item)} aria-label={item.is_active ? `Hide ${item.venue_name}` : `Show ${item.venue_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/30 active:scale-95">
                      {item.is_active ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.venue_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/30 active:scale-95">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.venue_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-95">
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Drawer open={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? 'Edit class' : 'Add class'}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditorOpen(false)} className="h-11 flex-1 rounded-xl border border-slate-200 font-semibold text-slate-700 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98]">Cancel</button>
            <button type="button" onClick={save} disabled={saving || !form.venue_name.trim()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#c20f24] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#a60d1f] disabled:opacity-50 active:scale-[0.98]">
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save class
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Exam year</span>
            <input type="number" min="2020" max="2100" className={inputCls} value={form.exam_year} onChange={(event) => setForm({ ...form, exam_year: Number(event.target.value) })} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Institute or class name</span>
            <input className={inputCls} value={form.venue_name} onChange={(event) => setForm({ ...form, venue_name: event.target.value })} placeholder="e.g. SyZyGy" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Online platform</span>
            <input className={inputCls} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Zoom / Google Meet" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Day</span>
            <select className={inputCls} value={form.day_of_week} onChange={(event) => setForm({ ...form, day_of_week: Number(event.target.value) })}>
              {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label} — {day.si}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Starts</span>
              <input type="time" className={inputCls} value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Ends</span>
              <input type="time" className={inputCls} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Short note <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#c20f24]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/20" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="e.g. Recordings are available after the live class" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Registration link <span className="font-normal text-slate-400">(optional)</span></span>
            <input type="url" className={inputCls} value={form.registration_url} onChange={(event) => setForm({ ...form, registration_url: event.target.value })} placeholder="https://wa.me/…" />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="h-4 w-4 rounded accent-[#c20f24]" />
            <span>
              <span className="block text-sm font-semibold text-slate-700">Visible on landing page</span>
              <span className="mt-0.5 block text-xs text-slate-400">You can hide this class without deleting it.</span>
            </span>
          </label>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete “${deleteTarget?.venue_name}”?`}
        message="This class will be removed from the public timetable permanently."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
