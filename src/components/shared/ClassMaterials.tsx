import { motion } from 'framer-motion';
import { BookOpenIcon, CheckCircleIcon, ClipboardListIcon } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The downloadable materials for a month of classes: paper class papers,
 * homework sheets and timing papers.
 *
 * Everything is in the brand red. "Which is which" comes from structure
 * rather than colour: every section is titled and explains itself in one
 * line, and a paper and its marking scheme are drawn as two different
 * sheets — lines for the paper, a tick for the answers — with the scheme
 * a lighter red so the question paper reads as the one to open first.
 */

type Tute = { name: string; url: string };

type Kind = 'paper' | 'scheme';

const GLYPH: Record<Kind, string> = {
  paper: 'text-[#c20f24]',
  scheme: 'text-red-400'
};

/** A sheet of paper with a folded corner — lines for a paper, a tick for answers. */
function Sheet({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 28 34" className={`w-7 h-[34px] shrink-0 ${GLYPH[kind]}`} aria-hidden="true">
      <path
        d="M3.5 1h14.5l7 7v22.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 1 30.5v-27A2.5 2.5 0 0 1 3.5 1z"
        fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M18 1v5a2 2 0 0 0 2 2h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {kind === 'scheme' ? (
        <path d="M8 19.5l3.6 3.6L20.5 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6.5 14h12" />
          <path d="M6.5 19h15" />
          <path d="M6.5 24h10" />
        </g>
      )}
    </svg>
  );
}

function FileTile({ href, kind, label, hint, ariaLabel }: {
  href: string; kind: Kind; label: string; hint: string; ariaLabel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="group flex items-center gap-3 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 transition-colors outline-none hover:border-red-300 hover:bg-red-50/60 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
    >
      <Sheet kind={kind} />
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-slate-800 group-hover:text-[#c20f24] leading-tight transition-colors">{label}</span>
        <span className="block text-[11px] text-slate-400 mt-0.5 truncate">{hint}</span>
      </span>
    </a>
  );
}

/** Shown in place of the scheme tile until the teacher uploads it. */
function SchemePending() {
  return (
    <div className="flex items-center gap-3 min-w-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <svg viewBox="0 0 28 34" className="w-7 h-[34px] shrink-0 text-slate-300" aria-hidden="true">
        <path
          d="M3.5 1h14.5l7 7v22.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 1 30.5v-27A2.5 2.5 0 0 1 3.5 1z"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2.5" strokeLinejoin="round"
        />
      </svg>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-slate-400 leading-tight">Marking scheme</span>
        <span className="block text-[11px] text-slate-400 mt-0.5">Not released yet</span>
      </span>
    </div>
  );
}

function Section({ title, count, blurb, index, children }: {
  title: string; count: number; blurb: string; index: number; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white border border-slate-100 rounded-[2rem] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
    >
      <header className="flex gap-3.5 mb-5">
        <span className="w-1.5 rounded-full shrink-0 bg-[#c20f24]" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="flex items-center gap-2.5 text-lg font-black text-slate-900 leading-tight">
            {title}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums bg-red-50 text-[#c20f24]">{count}</span>
          </h3>
          <p className="text-sm text-slate-500 mt-1">{blurb}</p>
        </div>
      </header>
      {children}
    </motion.section>
  );
}

/** A homework sheet as a card: icon, title, then Sheet and Scheme buttons. */
function HomeworkCard({ title, sheetUrl, schemeUrl }: { title: string; sheetUrl?: string; schemeUrl?: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-slate-50 border border-slate-100 p-5">
      <span className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
        <ClipboardListIcon className="w-6 h-6" />
      </span>
      <p className="mt-4 text-base font-bold text-slate-700 truncate" title={title}>{title}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Weekly Homework</p>
      <div className="flex flex-wrap items-center gap-2 mt-5">
        {sheetUrl && (
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open homework sheet: ${title}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            <BookOpenIcon className="w-4 h-4" /> Sheet
          </a>
        )}
        {schemeUrl && (
          <a href={schemeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open marking scheme: ${title}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2">
            <CheckCircleIcon className="w-4 h-4" /> Scheme
          </a>
        )}
      </div>
    </div>
  );
}

/** One paper or homework sheet: its title, then the question file beside its answers. */
function PairedItem({ title, fileUrl, schemeUrl, fileLabel }: {
  title: string; fileUrl?: string; schemeUrl?: string; fileLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-3 sm:p-4">
      <p className="text-sm font-bold text-slate-800 mb-3 px-1 leading-snug">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {fileUrl ? (
          <FileTile href={fileUrl} kind="paper" label={fileLabel} hint="Start here" ariaLabel={`Open ${fileLabel.toLowerCase()}: ${title}`} />
        ) : (
          <div className="flex items-center rounded-2xl border border-dashed border-slate-200 px-3 py-2.5 text-[12px] text-slate-400">
            {fileLabel} not uploaded
          </div>
        )}
        {schemeUrl ? (
          <FileTile href={schemeUrl} kind="scheme" label="Marking scheme" hint="Answers — open after you attempt it" ariaLabel={`Open marking scheme: ${title}`} />
        ) : (
          <SchemePending />
        )}
      </div>
    </div>
  );
}

export function ClassMaterials({ papers, homeworks, notes }: { papers: any[]; homeworks: any[]; notes: Tute[] }) {
  if (papers.length === 0 && homeworks.length === 0 && notes.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-slate-200">
        <p className="text-sm font-bold text-slate-600">No materials for this month yet</p>
        <p className="text-sm text-slate-400 mt-1">Papers, homework and timing papers will appear here once they're added.</p>
      </div>
    );
  }

  let index = 0;

  return (
    <div className="space-y-6">
      {papers.length > 0 && (
        <Section title="Paper Class Papers" count={papers.length} index={index++}
          blurb="Sit the paper first, then check your answers with the marking scheme.">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {papers.map((p, i) => (
              <PairedItem key={p.id ?? i} title={p.title || 'Paper'} fileUrl={p.paper_url} schemeUrl={p.scheme_url} fileLabel="Question paper" />
            ))}
          </div>
        </Section>
      )}

      {homeworks.length > 0 && (
        <Section title="Homework Sheets" count={homeworks.length} index={index++}
          blurb="Weekly practice. Mark your own work with the scheme when you're done.">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {homeworks.map((h, i) => (
              <HomeworkCard key={h.id ?? i} title={h.title || 'Homework'} sheetUrl={h.homework_url} schemeUrl={h.scheme_url} />
            ))}
          </div>
        </Section>
      )}

      {notes.length > 0 && (
        <Section title="Timing Papers" count={notes.length} index={index++}
          blurb="Timing papers from this month's lessons.">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {notes.map((t, i) => (
              <FileTile key={`${t.url}-${i}`} href={t.url} kind="paper"
                label={t.name || `Timing paper ${i + 1}`} hint="Opens in a new tab"
                ariaLabel={`Open ${t.name || `timing paper ${i + 1}`}`} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
