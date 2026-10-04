import { useState, useRef, type ReactNode, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PencilIcon, Trash2Icon, CheckIcon, XIcon, UploadCloudIcon, FileTextIcon } from 'lucide-react';

/**
 * The small pieces the Monthly Recordings screens share.
 *
 * The page used to be four drawers and two hand-rolled modals, each with
 * its own form styling. Everything that was duplicated lives here once:
 * the field styles, the dashed PDF picker, the composer card the lists sit
 * beside, and the delete that confirms in place instead of over the page.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Apple's springs rather than durations: an interrupted move keeps its velocity. */
export const SPRING = { type: 'spring' as const, duration: 0.45, bounce: 0.18 };
export const SPRING_SOFT = { type: 'spring' as const, duration: 0.5, bounce: 0.12 };

export const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40 transition-shadow';

export const labelCls = 'block text-[12px] font-bold text-slate-600 mb-1.5';

/* ── Composer ──────────────────────────────────────────────────────── */

/**
 * The card beside each list where a thing is written. It stays open and
 * sticky on wide screens, so adding five sessions in a row never means
 * opening and closing anything.
 */
export function Composer({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="lg:sticky lg:top-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <header className="px-5 pt-5 pb-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
        {description && <p className="text-[12px] text-slate-500 mt-0.5">{description}</p>}
      </header>
      <div className="p-5 space-y-3.5">{children}</div>
      {footer && <div className="px-5 pb-5">{footer}</div>}
    </div>
  );
}

/** A red note inside a composer — the old code used window.alert for these. */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-[12px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
      {children}
    </p>
  );
}

/** A green note, shown for a few seconds after something saves. */
export function FormNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
      {children}
    </p>
  );
}

/* ── PDF picker ────────────────────────────────────────────────────── */

export function FilePicker({
  label,
  hint,
  file,
  existing,
  onPick,
  icon: Icon = FileTextIcon
}: {
  label: string;
  hint?: string;
  file: File | null;
  /** A file already uploaded, so the picker can say it is replacing one. */
  existing?: string | null;
  onPick: (f: File | null) => void;
  icon?: ComponentType<{ className?: string }>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const state = file ? 'picked' : existing ? 'has' : 'empty';

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`w-full h-11 rounded-xl border border-dashed text-[13px] font-semibold flex items-center gap-2 px-3.5 text-left transition-colors active:scale-[0.99] duration-150 ${
          state === 'picked'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : state === 'has'
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#c20f24]/40 hover:text-[#c20f24]'
              : 'border-slate-300 bg-white text-slate-500 hover:border-[#c20f24]/40 hover:text-[#c20f24]'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">
          {file ? file.name : existing ? 'Uploaded — pick a file to replace' : (hint ?? 'Choose a PDF')}
        </span>
        {file && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Remove ${file.name}`}
            onClick={(e) => { e.stopPropagation(); onPick(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onPick(null); } }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
    </div>
  );
}

/** The image picker for a month's thumbnail. */
export function ImagePicker({ preview, onPick }: { preview?: string; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={labelCls}>Thumbnail</label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full aspect-[16/9] rounded-xl border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 hover:border-[#c20f24]/40 hover:text-[#c20f24] transition-colors group"
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-[13px] font-semibold">
            <UploadCloudIcon className="w-5 h-5" /> Upload an image
          </span>
        )}
      </button>
    </div>
  );
}

/* ── Row actions ───────────────────────────────────────────────────── */

/**
 * Edit and delete for a list row. Delete turns the pair into a yes/no in
 * the same place rather than throwing a dialog over the screen — the thing
 * being deleted stays visible while the question is asked.
 */
export function RowActions({ onEdit, onDelete, label }: { onEdit?: () => void; onDelete: () => void; label: string }) {
  const reduce = useReducedMotion();
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        {asking ? (
          <motion.div
            key="ask"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            transition={reduce ? { duration: 0.1 } : SPRING}
            className="flex items-center gap-1"
          >
            <span className="text-[12px] font-semibold text-slate-500 pr-1 hidden sm:inline">Delete?</span>
            <button
              onClick={() => { setAsking(false); onDelete(); }}
              aria-label={`Confirm deleting ${label}`}
              className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors active:scale-95 duration-150"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAsking(false)}
              aria-label="Keep it"
              className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            transition={reduce ? { duration: 0.1 } : SPRING}
            className="flex items-center gap-1"
          >
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label={`Edit ${label}`}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setAsking(true)}
              aria-label={`Delete ${label}`}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95 duration-150"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Who a month is for, in words rather than an id list. */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function audienceText(m: any, batches: any[]): string {
  if (!m) return '—';
  if (m.audience_scope === 'public') return 'Everyone';
  if (m.audience_scope === 'program') return `All ${m.audience_program}`;
  const ids: string[] = m.batch_ids ?? [];
  if (ids.length === 0) return 'No batches yet';
  if (ids.length === 1) return batches.find((b) => b.id === ids[0])?.name ?? '1 batch';
  return `${ids.length} batches`;
}

export const rupees = (n: unknown) =>
  n == null || Number(n) === 0 ? 'Free' : `Rs. ${Number(n).toLocaleString('en-LK')}`;

/** A small file link, used under homework / paper rows. */
export function FileLink({
  href,
  children,
  icon: Icon,
  tone = 'slate'
}: {
  href?: string | null;
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: 'slate' | 'red';
}) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-300 font-medium">
        <Icon className="w-3.5 h-3.5" /> No {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold hover:underline ${
        tone === 'red' ? 'text-[#c20f24]' : 'text-slate-600'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </a>
  );
}
