import { useEffect, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRightIcon, SearchIcon, XIcon } from 'lucide-react';

/**
 * The admin design kit.
 *
 * Every admin page was styling its own headings, cards, tables and pills,
 * so the panel drifted page by page. These are the shared pieces: one
 * header shape, one card, one table frame, one status pill, one stat tile.
 *
 * House style, for anything built on top of this:
 *   surface   white card, rounded-2xl, 1px slate-200 border, no shadow
 *   page      warm off-white (#FAF9F8), never pure white
 *   accent    the brand red, used for what is active or urgent, nothing else
 *   numbers   tabular-nums, so columns of figures line up
 */

/* ── Page header ───────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1.5">{eyebrow}</p>
        )}
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Banner ────────────────────────────────────────────────────────── */

const BANNER_TONES = {
  danger: { wrap: 'bg-red-50/70 border-red-100', tile: 'bg-red-100 text-red-600', link: 'text-red-600 hover:text-red-700' },
  warn: { wrap: 'bg-amber-50/70 border-amber-100', tile: 'bg-amber-100 text-amber-600', link: 'text-amber-600 hover:text-amber-700' },
  info: { wrap: 'bg-slate-50 border-slate-200', tile: 'bg-slate-200 text-slate-600', link: 'text-slate-600 hover:text-slate-900' }
} as const;

export function Banner({
  tone = 'info',
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  tone?: keyof typeof BANNER_TONES;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = BANNER_TONES[tone];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 ${t.wrap}`}>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.tile}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          className={`text-sm font-semibold inline-flex items-center gap-1 shrink-0 transition-colors ${t.link}`}
        >
          {actionLabel} <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ── Quick action ──────────────────────────────────────────────────── */

export function QuickAction({
  icon: Icon,
  title,
  description,
  onClick
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 w-full text-left rounded-2xl border border-slate-200 bg-white px-4 py-3.5 hover:border-slate-300 hover:bg-slate-50/60 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-red-50 text-[#c20f24] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-900 truncate">{title}</span>
        <span className="block text-[12px] text-slate-500 truncate">{description}</span>
      </span>
      <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </button>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  actions,
  className = '',
  bodyClassName = 'p-5',
  children
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="font-bold text-slate-900">{title}</h2>}
            {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────── */

/** A tiny trend line. Flat data draws a flat line rather than nothing. */
export function Sparkline({ points, tone = 'red' }: { points: number[]; tone?: 'red' | 'slate' }) {
  if (!points.length) return null;
  const w = 76;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points.map((p, i) => `${i * step},${h - ((p - min) / span) * (h - 4) - 2}`).join(' L ');
  const stroke = tone === 'red' ? '#c20f24' : '#94a3b8';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      <path d={`M ${d}`} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  points,
  onClick
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  /** e.g. "+1.2%" — green when it starts with +, red with -, grey otherwise */
  delta?: string;
  points?: number[];
  onClick?: () => void;
}) {
  const deltaTone = !delta ? '' : delta.startsWith('+') ? 'text-emerald-600' : delta.startsWith('-') ? 'text-red-600' : 'text-slate-500';
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-5 text-left w-full ${
        onClick ? 'hover:border-slate-300 transition-colors' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {delta && <span className={`text-[12px] font-bold ${deltaTone}`}>{delta}</span>}
      </div>
      <div className="flex items-end justify-between gap-3 mt-2">
        <div className="min-w-0">
          <p className="text-[30px] leading-none font-bold text-slate-900 tabular-nums truncate">{value}</p>
          {sub && <p className="text-[12px] text-slate-400 mt-2">{sub}</p>}
        </div>
        {points && points.length > 1 && <Sparkline points={points} />}
      </div>
    </Tag>
  );
}

/* ── Status pill ───────────────────────────────────────────────────── */

const PILL_TONES = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700'
} as const;

export function StatusPill({ tone = 'slate', children }: { tone?: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${PILL_TONES[tone]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

/* ── Search + filters ──────────────────────────────────────────────── */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = ''
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]/40"
      />
    </div>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────────── */

export function TableFrame({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">{head}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-bold ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 text-slate-700 ${className}`}>{children}</td>;
}

/* ── Avatar ────────────────────────────────────────────────────────── */

export function Initials({ name, src, size = 36 }: { name?: string | null; src?: string | null; size?: number }) {
  const letters = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (src) {
    return <img src={src} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="rounded-full bg-red-50 text-[#c20f24] font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {letters}
    </span>
  );
}

/* ── Empty state ───────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-14 text-center">
      <Icon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Buttons ───────────────────────────────────────────────────────── */

export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  ...rest
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-[#c20f24] text-white hover:bg-[#a60d1f]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  }[variant];
  return (
    <button
      {...rest}
      className={`h-11 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${styles} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────── */

/**
 * A centred dialog, for work that needs the whole of someone's attention
 * but not a whole page: a short form, a roster.
 *
 * Motion, per the house rules: scale from 0.97 and never from 0, 200ms on
 * a strong ease-out, and `transform-origin: center` — a modal is not
 * anchored to a trigger, so it has nowhere else to come from. Escape and
 * a click on the backdrop both close it, and the body stops scrolling
 * behind it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] modal-backdrop" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-lenis-prevent
        className={`relative w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} my-auto bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh] modal-panel`}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-[17px] truncate">{title}</h2>
            {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors active:scale-95 duration-150"
          >
            <XIcon className="w-4.5 h-4.5" />
          </button>
        </header>

        <div data-lenis-prevent className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && <footer className="px-6 py-4 border-t border-slate-100 shrink-0">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
