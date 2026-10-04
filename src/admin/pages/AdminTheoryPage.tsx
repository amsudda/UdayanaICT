import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  PlusIcon, CalendarIcon, VideoIcon, ClipboardListIcon, FileTextIcon, LinkIcon,
  EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon, ChevronRightIcon, SearchIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader, Button, SearchInput, FilterTabs, StatusPill, EmptyState, StatCard } from '../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MonthEditor } from './theory/MonthEditor';
import { MonthWorkspace } from './theory/MonthWorkspace';
import { MONTHS, SPRING, SPRING_SOFT, audienceText, rupees } from './theory/kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Monthly recordings.
 *
 * Two places, not one page with four drawers hanging off it: the library
 * of months, and a month's own page at /admin/theory/:monthId. Opening a
 * month pushes its page in from the right the way iOS pushes a detail
 * screen — it has a back button, a URL that survives a refresh, and the
 * browser's own back works. Nothing slides over the page any more except
 * the short form for a month's own details.
 *
 * The library reads like a shelf: a card per month with its thumbnail and,
 * on the face of it, how much is actually in it — sessions, sheets, papers
 * and live links — so a half-finished month is obvious without opening it.
 */

type Status = 'all' | 'published' | 'draft';

/**
 * A month with no thumbnail gets a dark face rather than a grey hole. The
 * tones are deliberately quiet and all of a family — the shelf should read
 * as one thing, and the brand red is kept for what is active or urgent.
 */
const GRADIENTS = [
  'linear-gradient(135deg,#334155 0%,#0f172a 100%)',
  'linear-gradient(135deg,#3f3f46 0%,#18181b 100%)',
  'linear-gradient(135deg,#1e3a8a 0%,#111c3a 100%)',
  'linear-gradient(135deg,#7f1d1d 0%,#2c0a0a 100%)',
  'linear-gradient(135deg,#115e59 0%,#042f2e 100%)',
  'linear-gradient(135deg,#78350f 0%,#2a1304 100%)'
];

export function AdminTheoryPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { monthId } = useParams<{ monthId: string }>();

  const [months, setMonths] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, { v: number; h: number; p: number; l: number }>>({});
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [ms, bs, tv, th, tp, tl] = await Promise.all([
      supabase.from('theory_months').select('*').order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, program').order('exam_year', { ascending: false }),
      supabase.from('theory_videos').select('theory_month_id'),
      supabase.from('theory_homework').select('theory_month_id'),
      supabase.from('theory_papers').select('theory_month_id'),
      supabase.from('theory_live_links').select('theory_month_id')
    ]);

    const tally: Record<string, { v: number; h: number; p: number; l: number }> = {};
    const bump = (rows: any[] | null, key: 'v' | 'h' | 'p' | 'l') =>
      (rows ?? []).forEach((r: any) => {
        const id = r.theory_month_id;
        if (!id) return;
        tally[id] ??= { v: 0, h: 0, p: 0, l: 0 };
        tally[id][key] += 1;
      });
    bump(tv.data, 'v');
    bump(th.data, 'h');
    bump(tp.data, 'p');
    bump(tl.data, 'l');

    setMonths(ms.data ?? []);
    setBatches(bs.data ?? []);
    setCounts(tally);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMonth = monthId ? months.find((m) => m.id === monthId) ?? null : null;

  const totals = useMemo(() => {
    const sessions = Object.values(counts).reduce((s, c) => s + c.v, 0);
    return {
      months: months.length,
      published: months.filter((m) => m.is_published).length,
      drafts: months.filter((m) => !m.is_published).length,
      sessions
    };
  }, [months, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return months.filter((m) => {
      const okStatus = status === 'all' || (status === 'published' ? m.is_published : !m.is_published);
      if (!okStatus) return false;
      if (!q) return true;
      return `${m.month} ${m.year} ${(m.topics ?? []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [months, query, status]);

  /** Newest year first, and inside a year the latest month first. */
  const years = useMemo(() => {
    const ys = [...new Set(filtered.map((m) => String(m.year)))].sort((a, b) => Number(b) - Number(a));
    return ys.map((y) => [
      y,
      filtered.filter((m) => String(m.year) === y).sort((a, b) => MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month))
    ] as [string, any[]]);
  }, [filtered]);

  const togglePublish = async (m: any) => {
    await supabase.from('theory_months').update({ is_published: !m.is_published }).eq('id', m.id);
    load();
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    await supabase.from('theory_months').delete().eq('id', target.id);
    if (monthId === target.id) navigate('/admin/theory');
    load();
  };

  return (
    <div className="max-w-6xl">
      <AnimatePresence mode="wait" initial={false}>
        {monthId ? (
          /* ══ one month's own page ══ */
          <motion.div
            key="month"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateX(28px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateX(28px)' }}
            transition={reduce ? { duration: 0.12 } : SPRING_SOFT}
          >
            <MonthWorkspace
              month={openMonth}
              loading={loading}
              batches={batches}
              onEdit={() => { setEditing(openMonth); setEditorOpen(true); }}
              onDelete={() => setDeleteTarget(openMonth)}
              onChanged={load}
            />
          </motion.div>
        ) : (
          /* ══ the library ══ */
          <motion.div
            key="library"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateX(-16px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateX(-16px)' }}
            transition={reduce ? { duration: 0.12 } : SPRING_SOFT}
          >
            <PageHeader
              eyebrow="Content"
              title="Monthly recordings"
              description="A month per card. Open one to put its sessions, homework sheets, papers and live links in."
              actions={
                <Button icon={PlusIcon} onClick={() => { setEditing(null); setEditorOpen(true); }}>
                  New month
                </Button>
              }
            />

            {!loading && months.length > 0 && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <StatCard label="Months" value={totals.months} sub="in the library" onClick={() => setStatus('all')} />
                  <StatCard label="Published" value={totals.published} sub="students can see these" onClick={() => setStatus('published')} />
                  <StatCard label="Drafts" value={totals.drafts} sub="hidden for now" onClick={() => setStatus('draft')} />
                  <StatCard label="Sessions" value={totals.sessions} sub="recordings in all" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                  <SearchInput value={query} onChange={setQuery} placeholder="Find a month or a topic…" className="sm:w-80" />
                  <FilterTabs<Status>
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'all', label: `All ${totals.months}` },
                      { value: 'published', label: `Published ${totals.published}` },
                      { value: 'draft', label: `Drafts ${totals.drafts}` }
                    ]}
                  />
                </div>
              </>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="aspect-[16/9] bg-slate-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
                      <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : months.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                  icon={CalendarIcon}
                  title="No months yet"
                  description="Add the first month, then put its recordings, homework sheets and papers in."
                  action={<Button icon={PlusIcon} onClick={() => { setEditing(null); setEditorOpen(true); }}>New month</Button>}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                  icon={SearchIcon}
                  title="Nothing matches that"
                  description="Try a different month or topic, or clear the filter."
                  action={<Button variant="secondary" onClick={() => { setQuery(''); setStatus('all'); }}>Clear</Button>}
                />
              </div>
            ) : (
              <div className="space-y-8">
                {years.map(([year, group]) => (
                  <section key={year}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">{year}</h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 tabular-nums">{group.length}</span>
                      <span className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.map((m, i) => (
                        <MonthCard
                          key={m.id}
                          month={m}
                          index={i}
                          counts={counts[m.id] ?? { v: 0, h: 0, p: 0, l: 0 }}
                          batches={batches}
                          reduce={!!reduce}
                          onOpen={() => navigate(`/admin/theory/${m.id}`)}
                          onTogglePublish={() => togglePublish(m)}
                          onEdit={() => { setEditing(m); setEditorOpen(true); }}
                          onDelete={() => setDeleteTarget(m)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MonthEditor
        open={editorOpen}
        editing={editing}
        batches={batches}
        onClose={() => setEditorOpen(false)}
        onSaved={(newId) => {
          setEditorOpen(false);
          load();
          // a brand new month opens straight into its own page — the next
          // thing you want is to put sessions in it
          if (!editing && newId) navigate(`/admin/theory/${newId}`);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.month} ${deleteTarget?.year}?`}
        message="This removes the month along with its sessions, homework sheets, papers and live links."
        confirmLabel="Delete month"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ── One month, on the shelf ───────────────────────────────────────── */

function MonthCard({
  month,
  index,
  counts,
  batches,
  reduce,
  onOpen,
  onTogglePublish,
  onEdit,
  onDelete
}: {
  month: any;
  index: number;
  counts: { v: number; h: number; p: number; l: number };
  batches: any[];
  reduce: boolean;
  onOpen: () => void;
  onTogglePublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const topics: string[] = Array.isArray(month.topics) ? month.topics : [];
  const gradient = GRADIENTS[MONTHS.indexOf(month.month) % GRADIENTS.length];
  const empty = counts.v + counts.h + counts.p + counts.l === 0;

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, transform: 'translateY(10px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={reduce ? { duration: 0 } : { ...SPRING, delay: Math.min(index, 8) * 0.035 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open ${month.month} ${month.year}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="group text-left rounded-2xl border border-slate-200 bg-white overflow-hidden cursor-pointer transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c20f24]/40"
    >
      {/* the face */}
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: gradient }}>
        {month.thumbnail_url ? (
          <img
            src={month.thumbnail_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-start justify-end p-4">
            <p className="text-white/90 text-[30px] font-bold leading-none tracking-tight">{month.month.slice(0, 3)}</p>
            <p className="text-white/50 text-[13px] font-bold tabular-nums mt-1">{month.year}</p>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className="inline-flex rounded-full bg-white/90 backdrop-blur-sm p-0.5">
            <StatusPill tone={month.is_published ? 'green' : 'slate'}>
              {month.is_published ? 'Published' : 'Draft'}
            </StatusPill>
          </span>
        </div>

        {month.price != null && (
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-900/70 text-white backdrop-blur-sm tabular-nums">
            {rupees(month.price)}
          </span>
        )}
      </div>

      {/* what it is */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{month.month} {month.year}</h3>
            <p className="text-[12px] text-slate-500 truncate mt-0.5">
              {topics.length ? topics.join(' · ') : 'No topics yet'}
            </p>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
        </div>

        {/* what is actually in it */}
        <div className="flex items-center gap-3 mt-3.5 flex-wrap">
          {empty ? (
            <span className="text-[12px] font-semibold text-amber-600">Nothing uploaded yet</span>
          ) : (
            <>
              <Tally icon={VideoIcon} n={counts.v} label="sessions" />
              <Tally icon={ClipboardListIcon} n={counts.h} label="homework sheets" />
              <Tally icon={FileTextIcon} n={counts.p} label="papers" />
              <Tally icon={LinkIcon} n={counts.l} label="live links" />
            </>
          )}
        </div>

        {/* who, and the three things you do to a month */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3.5 border-t border-slate-100">
          <p className="text-[12px] text-slate-400 truncate">{audienceText(month, batches)}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={stop(onTogglePublish)}
              aria-label={`${month.is_published ? 'Unpublish' : 'Publish'} ${month.month} ${month.year}`}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
            >
              {month.is_published ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={stop(onEdit)}
              aria-label={`Edit ${month.month} ${month.year}`}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={stop(onDelete)}
              aria-label={`Delete ${month.month} ${month.year}`}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95 duration-150"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Tally({ icon: Icon, n, label }: { icon: typeof VideoIcon; n: number; label: string }) {
  return (
    <span
      title={`${n} ${label}`}
      className={`inline-flex items-center gap-1.5 text-[12px] font-bold tabular-nums ${n ? 'text-slate-700' : 'text-slate-300'}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
