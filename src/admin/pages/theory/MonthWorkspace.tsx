import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, Loader2Icon,
  VideoIcon, ClipboardListIcon, FileTextIcon, LinkIcon, BookOpenIcon,
  EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon, CalendarIcon, ExternalLinkIcon
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { extractYouTubeId as parseYouTubeId } from '../../../lib/youtube';
import { VIDEO_KINDS, toVideoKind, videoKindLabel, type VideoKind } from '../../../data/videoCategories';
import { Button, EmptyState, StatusPill } from '../../components/ui';
import {
  SPRING, SPRING_SOFT, inputCls, labelCls, Composer, FormError, FormNote,
  FilePicker, RowActions, FileLink, audienceText, rupees
} from './kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * One month, as a page of its own.
 *
 * Everything that used to slide in from the right — sessions, homework
 * sheets, paper-class papers, live links — is a section of this page now.
 * Four of them, on a segmented bar, with the list on the left and the
 * thing you write in it sticky on the right. Adding six sessions in a row
 * means typing six times, not opening and closing a drawer six times.
 *
 * The section lives in the URL (?tab=homework), so a refresh, a back
 * button and a shared link all land in the same place.
 */

type Tab = 'sessions' | 'homework' | 'papers' | 'links';

const TABS: { key: Tab; label: string; icon: typeof VideoIcon }[] = [
  { key: 'sessions', label: 'Sessions', icon: VideoIcon },
  { key: 'homework', label: 'Homework', icon: ClipboardListIcon },
  { key: 'papers', label: 'Papers', icon: FileTextIcon },
  { key: 'links', label: 'Live links', icon: LinkIcon }
];

const KIND_TONE: Record<VideoKind, 'slate' | 'blue' | 'violet'> = {
  lesson: 'slate',
  question_book: 'blue',
  paper: 'violet'
};

const emptyVideo = { id: '', title: '', youtube: '', duration: '', kind: 'lesson' as VideoKind, tutes: [] as { name: string; url: string }[] };
const emptySheet = { id: '', title: '', homework_url: '', scheme_url: '' };
const emptyPaper = { id: '', title: '', paper_url: '', scheme_url: '' };
const emptyLink = { id: '', label: '', url: '' };

export function MonthWorkspace({
  month,
  loading,
  batches,
  onEdit,
  onDelete,
  onChanged
}: {
  month: any | null;
  loading: boolean;
  batches: any[];
  onEdit: () => void;
  onDelete: () => void;
  /** Tell the library its counts changed. */
  onChanged: () => void;
}) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'sessions') as Tab;
  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === 'sessions') p.delete('tab');
    else p.set('tab', next);
    setParams(p, { replace: true });
  };

  const monthId: string | undefined = month?.id;

  const [videos, setVideos] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  const loadAll = useCallback(async () => {
    if (!monthId) return;
    setBusy(true);
    const [v, h, p, l] = await Promise.all([
      supabase.from('theory_videos').select('*').eq('theory_month_id', monthId).order('sort_order'),
      supabase.from('theory_homework').select('*').eq('theory_month_id', monthId).order('sort_order'),
      supabase.from('theory_papers').select('*').eq('theory_month_id', monthId).order('sort_order'),
      supabase.from('theory_live_links').select('*').eq('theory_month_id', monthId).order('sort_order')
    ]);
    setVideos(v.data ?? []);
    setSheets(h.data ?? []);
    setPapers(p.data ?? []);
    setLinks(l.data ?? []);
    setBusy(false);
  }, [monthId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const counts = useMemo(
    () => ({ sessions: videos.length, homework: sheets.length, papers: papers.length, links: links.length }),
    [videos, sheets, papers, links]
  );

  /* ── sessions ───────────────────────────────────────────────────── */
  const [vForm, setVForm] = useState(emptyVideo);
  const [tuteFiles, setTuteFiles] = useState<File[]>([]);
  const [vSaving, setVSaving] = useState(false);
  const [vErr, setVErr] = useState('');
  const [vNote, setVNote] = useState('');

  const resetVideo = () => { setVForm(emptyVideo); setTuteFiles([]); setVErr(''); };

  const saveVideo = async () => {
    if (!monthId || !vForm.title.trim()) return;
    if (!vForm.youtube.trim() && vForm.tutes.length === 0 && tuteFiles.length === 0) {
      setVErr('Give it a YouTube link or at least one PDF — otherwise there is nothing for students to open.');
      return;
    }
    setVSaving(true);
    setVErr('');

    const tutes = [...vForm.tutes];
    for (const f of tuteFiles) {
      const path = `theory/${monthId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.pdf`;
      const { error } = await supabase.storage.from('tutes').upload(path, f, { upsert: true, contentType: 'application/pdf' });
      if (error) {
        setVSaving(false);
        setVErr(`"${f.name}" would not upload.\n${error.message}\n\nIf the bucket is missing, run supabase/migration_tutes.sql.`);
        return;
      }
      tutes.push({ name: f.name, url: supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl });
    }

    const payload = {
      title: vForm.title.trim(),
      youtube_id: vForm.youtube.trim() ? parseYouTubeId(vForm.youtube) : null,
      duration_label: vForm.duration.trim() || null,
      kind: vForm.kind,
      tutes
    };

    let error;
    if (vForm.id) ({ error } = await supabase.from('theory_videos').update(payload).eq('id', vForm.id));
    else {
      const nextOrder = videos.length ? Math.max(...videos.map((v) => v.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('theory_videos').insert({ ...payload, theory_month_id: monthId, sort_order: nextOrder }));
    }

    setVSaving(false);
    if (error) {
      setVErr(`The session would not save.\n${error.message}\n\nIf this mentions a missing "tutes" column, run supabase/migration_tutes_multi.sql.`);
      return;
    }

    resetVideo();
    setVNote(`"${payload.title}" saved · ${tutes.length} PDF${tutes.length === 1 ? '' : 's'} attached`);
    window.setTimeout(() => setVNote(''), 5000);
    await reloadVideos();
  };

  const reloadVideos = async () => {
    if (!monthId) return;
    const { data } = await supabase.from('theory_videos').select('*').eq('theory_month_id', monthId).order('sort_order');
    setVideos(data ?? []);
    await supabase.from('theory_months').update({ session_count: (data ?? []).length }).eq('id', monthId);
    onChanged();
  };

  const editVideo = (v: any) => {
    setVErr('');
    setTuteFiles([]);
    setVForm({
      id: v.id,
      title: v.title ?? '',
      youtube: v.youtube_id ?? '',
      duration: v.duration_label ?? '',
      kind: toVideoKind(v.kind),
      tutes: Array.isArray(v.tutes) && v.tutes.length ? v.tutes : v.tute_url ? [{ name: 'Tute PDF', url: v.tute_url }] : []
    });
  };

  const deleteVideo = async (id: string) => {
    await supabase.from('theory_videos').delete().eq('id', id);
    if (vForm.id === id) resetVideo();
    await reloadVideos();
  };

  const moveVideo = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const a = videos[idx], b = videos[j];
    // optimistic, so the row moves under the cursor rather than after a round trip
    setVideos((list) => { const next = [...list]; next[idx] = b; next[j] = a; return next; });
    await supabase.from('theory_videos').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('theory_videos').update({ sort_order: a.sort_order }).eq('id', b.id);
    await reloadVideos();
  };

  /* ── homework sheets ────────────────────────────────────────────── */
  const [hForm, setHForm] = useState(emptySheet);
  const [hwFile, setHwFile] = useState<File | null>(null);
  const [hSchemeFile, setHSchemeFile] = useState<File | null>(null);
  const [hSaving, setHSaving] = useState(false);
  const [hErr, setHErr] = useState('');
  const [hNote, setHNote] = useState('');

  const resetSheet = () => { setHForm(emptySheet); setHwFile(null); setHSchemeFile(null); setHErr(''); };

  const upload = async (file: File, path: string) => {
    const { error } = await supabase.storage.from('tutes').upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (error) return { url: null as string | null, error: error.message };
    return { url: supabase.storage.from('tutes').getPublicUrl(path).data.publicUrl, error: null as string | null };
  };

  const saveSheet = async () => {
    if (!monthId || !hForm.title.trim()) return;
    setHSaving(true);
    setHErr('');

    const payload: any = { title: hForm.title.trim() };
    if (hwFile) {
      const r = await upload(hwFile, `theory-homework/${monthId}/${Date.now()}-hw.pdf`);
      if (r.error) { setHSaving(false); setHErr(`The homework PDF would not upload.\n${r.error}`); return; }
      payload.homework_url = r.url;
    }
    if (hSchemeFile) {
      const r = await upload(hSchemeFile, `theory-homework/${monthId}/${Date.now()}-scheme.pdf`);
      if (r.error) { setHSaving(false); setHErr(`The marking scheme would not upload.\n${r.error}`); return; }
      payload.scheme_url = r.url;
    }

    let error;
    if (hForm.id) ({ error } = await supabase.from('theory_homework').update(payload).eq('id', hForm.id));
    else {
      const nextOrder = sheets.length ? Math.max(...sheets.map((s) => s.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('theory_homework').insert({ ...payload, theory_month_id: monthId, sort_order: nextOrder }));
    }

    setHSaving(false);
    if (error) { setHErr(`The sheet would not save.\n${error.message}`); return; }

    resetSheet();
    setHNote(`"${payload.title}" saved`);
    window.setTimeout(() => setHNote(''), 5000);
    const { data } = await supabase.from('theory_homework').select('*').eq('theory_month_id', monthId).order('sort_order');
    setSheets(data ?? []);
    onChanged();
  };

  const deleteSheet = async (id: string) => {
    await supabase.from('theory_homework').delete().eq('id', id);
    if (hForm.id === id) resetSheet();
    setSheets((l) => l.filter((x) => x.id !== id));
    onChanged();
  };

  /* ── paper-class papers ─────────────────────────────────────────── */
  const [pForm, setPForm] = useState(emptyPaper);
  const [ppFile, setPpFile] = useState<File | null>(null);
  const [pSchemeFile, setPSchemeFile] = useState<File | null>(null);
  const [pSaving, setPSaving] = useState(false);
  const [pErr, setPErr] = useState('');
  const [pNote, setPNote] = useState('');

  const resetPaper = () => { setPForm(emptyPaper); setPpFile(null); setPSchemeFile(null); setPErr(''); };

  const savePaper = async () => {
    if (!monthId || !pForm.title.trim()) return;
    setPSaving(true);
    setPErr('');

    const payload: any = { title: pForm.title.trim() };
    if (ppFile) {
      const r = await upload(ppFile, `theory-papers/${monthId}/${Date.now()}-paper.pdf`);
      if (r.error) { setPSaving(false); setPErr(`The paper would not upload.\n${r.error}`); return; }
      payload.paper_url = r.url;
    }
    if (pSchemeFile) {
      const r = await upload(pSchemeFile, `theory-papers/${monthId}/${Date.now()}-scheme.pdf`);
      if (r.error) { setPSaving(false); setPErr(`The marking scheme would not upload.\n${r.error}`); return; }
      payload.scheme_url = r.url;
    }

    let error;
    if (pForm.id) ({ error } = await supabase.from('theory_papers').update(payload).eq('id', pForm.id));
    else {
      const nextOrder = papers.length ? Math.max(...papers.map((s) => s.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('theory_papers').insert({ ...payload, theory_month_id: monthId, sort_order: nextOrder }));
    }

    setPSaving(false);
    if (error) {
      setPErr(`The paper would not save.\n${error.message}\n\nIf this mentions a missing table, run supabase/migration_theory_papers.sql.`);
      return;
    }

    resetPaper();
    setPNote(`"${payload.title}" saved`);
    window.setTimeout(() => setPNote(''), 5000);
    const { data } = await supabase.from('theory_papers').select('*').eq('theory_month_id', monthId).order('sort_order');
    setPapers(data ?? []);
    onChanged();
  };

  const deletePaper = async (id: string) => {
    await supabase.from('theory_papers').delete().eq('id', id);
    if (pForm.id === id) resetPaper();
    setPapers((l) => l.filter((x) => x.id !== id));
    onChanged();
  };

  /* ── live links ─────────────────────────────────────────────────── */
  const [lForm, setLForm] = useState(emptyLink);
  const [lSaving, setLSaving] = useState(false);
  const [lErr, setLErr] = useState('');

  const resetLink = () => { setLForm(emptyLink); setLErr(''); };

  const saveLink = async () => {
    if (!monthId || !lForm.url.trim()) return;
    setLSaving(true);
    setLErr('');

    const payload = { label: lForm.label.trim() || 'Join live class', url: lForm.url.trim() };
    let error;
    if (lForm.id) ({ error } = await supabase.from('theory_live_links').update(payload).eq('id', lForm.id));
    else {
      const nextOrder = links.length ? Math.max(...links.map((l) => l.sort_order ?? 0)) + 1 : 0;
      ({ error } = await supabase.from('theory_live_links').insert({ ...payload, theory_month_id: monthId, sort_order: nextOrder }));
    }

    setLSaving(false);
    if (error) { setLErr(`The link would not save.\n${error.message}`); return; }

    resetLink();
    const { data } = await supabase.from('theory_live_links').select('*').eq('theory_month_id', monthId).order('sort_order');
    setLinks(data ?? []);
    onChanged();
  };

  const deleteLink = async (id: string) => {
    await supabase.from('theory_live_links').delete().eq('id', id);
    if (lForm.id === id) resetLink();
    setLinks((l) => l.filter((x) => x.id !== id));
    onChanged();
  };

  /* ── publish ────────────────────────────────────────────────────── */
  const togglePublish = async () => {
    if (!month) return;
    await supabase.from('theory_months').update({ is_published: !month.is_published }).eq('id', month.id);
    onChanged();
  };

  if (loading && !month) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-40 rounded-lg bg-slate-200 animate-pulse" />
        <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!month) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <EmptyState
          icon={CalendarIcon}
          title="That month is not here any more"
          description="It may have been deleted. Go back to the library and pick another."
          action={<Button variant="secondary" icon={ChevronLeftIcon} onClick={() => navigate('/admin/theory')}>Monthly recordings</Button>}
        />
      </div>
    );
  }

  const topics: string[] = Array.isArray(month.topics) ? month.topics : [];

  return (
    <div>
      {/* back, the way a pushed view offers it */}
      <button
        onClick={() => navigate('/admin/theory')}
        className="inline-flex items-center gap-1 -ml-1 mb-4 text-[14px] font-semibold text-[#c20f24] hover:text-[#a60d1f] transition-colors active:scale-[0.98] duration-150"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        Monthly recordings
      </button>

      {/* which month this is */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="w-[108px] h-[62px] rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-300">
          {month.thumbnail_url
            ? <img src={month.thumbnail_url} alt="" className="w-full h-full object-cover" />
            : <CalendarIcon className="w-5 h-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">
              {month.month} {month.year}
            </h1>
            <StatusPill tone={month.is_published ? 'green' : 'slate'}>
              {month.is_published ? 'Published' : 'Draft'}
            </StatusPill>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            {[topics.length ? topics.join(' · ') : 'No topics yet', audienceText(month, batches), rupees(month.price)].join('  ·  ')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" icon={month.is_published ? EyeOffIcon : EyeIcon} onClick={togglePublish}>
            {month.is_published ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="secondary" icon={PencilIcon} onClick={onEdit}>Edit</Button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${month.month} ${month.year}`}
            className="w-11 h-11 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95 duration-150"
          >
            <Trash2Icon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* the four sections, as one control that also counts what is in them */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {TABS.map((t) => {
          const on = t.key === tab;
          const n = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={on}
              className="relative min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left overflow-hidden transition-colors hover:border-slate-300 active:scale-[0.985] duration-150"
            >
              {on && (
                <motion.span
                  layoutId="theory-tab-pill"
                  transition={reduce ? { duration: 0 } : SPRING}
                  className="absolute inset-0 bg-slate-900"
                />
              )}
              <span className="relative z-10 flex items-center gap-2 min-w-0">
                <t.icon className={`w-4 h-4 shrink-0 ${on ? 'text-white/70' : 'text-slate-400'}`} />
                <span className={`text-[13px] font-bold truncate ${on ? 'text-white' : 'text-slate-600'}`}>{t.label}</span>
              </span>
              <span className={`relative z-10 block text-[24px] font-bold tabular-nums leading-none mt-2 ${on ? 'text-white' : 'text-slate-900'}`}>
                {busy ? '–' : n}
              </span>
            </button>
          );
        })}
      </div>

      {/* list on the left, the thing you write in it on the right */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }}
          transition={reduce ? { duration: 0.12 } : SPRING_SOFT}
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_368px] gap-5 items-start"
        >
            {/* ══ list ══ */}
            <div className="min-w-0">
              {busy ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
              ) : tab === 'sessions' ? (
                videos.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <EmptyState icon={VideoIcon} title="No sessions yet" description="Add the first recording on the right. Students see them in this order." />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    {videos.map((v, i) => {
                      const kind = toVideoKind(v.kind);
                      const pdfs = Array.isArray(v.tutes) && v.tutes.length ? v.tutes.length : v.tute_url ? 1 : 0;
                      const open = vForm.id === v.id;
                      return (
                        <div
                          key={v.id}
                          className={`rise-in flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''} ${open ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}`}
                          style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                        >
                          <div className="flex flex-col shrink-0">
                            <button
                              onClick={() => moveVideo(i, -1)}
                              disabled={i === 0}
                              aria-label={`Move ${v.title} up`}
                              className="w-7 h-6 rounded-md text-slate-300 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveVideo(i, 1)}
                              disabled={i === videos.length - 1}
                              aria-label={`Move ${v.title} down`}
                              className="w-7 h-6 rounded-md text-slate-300 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <span className="w-7 text-[12px] font-bold tabular-nums text-slate-300 shrink-0">{i + 1}</span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[14px] font-semibold text-slate-900 truncate">{v.title}</p>
                              {kind !== 'lesson' && <StatusPill tone={KIND_TONE[kind]}>{videoKindLabel(kind, 'short')}</StatusPill>}
                            </div>
                            <p className="text-[12px] text-slate-400 mt-0.5 truncate">
                              {[
                                v.duration_label || null,
                                v.youtube_id ? `YouTube ${v.youtube_id}` : 'PDF only',
                                pdfs ? `${pdfs} PDF${pdfs > 1 ? 's' : ''}` : null
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>

                          {v.youtube_id && (
                            <a
                              href={`https://youtu.be/${v.youtube_id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${v.title} on YouTube`}
                              className="w-9 h-9 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 hidden sm:flex items-center justify-center transition-colors shrink-0"
                            >
                              <ExternalLinkIcon className="w-4 h-4" />
                            </a>
                          )}

                          <RowActions label={v.title} onEdit={() => editVideo(v)} onDelete={() => deleteVideo(v.id)} />
                        </div>
                      );
                    })}
                  </div>
                )
              ) : tab === 'homework' ? (
                sheets.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <EmptyState icon={ClipboardListIcon} title="No homework sheets yet" description="Upload the week's sheet and its marking scheme on the right." />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    {sheets.map((h, i) => (
                      <div
                        key={h.id}
                        className={`rise-in flex items-center gap-3 px-4 py-3.5 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''} ${hForm.id === h.id ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}`}
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <ClipboardListIcon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-900 truncate">{h.title}</p>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <FileLink href={h.homework_url} icon={BookOpenIcon} tone="red">Homework PDF</FileLink>
                            <FileLink href={h.scheme_url} icon={FileTextIcon}>Marking scheme</FileLink>
                          </div>
                        </div>
                        <RowActions
                          label={h.title}
                          onEdit={() => { setHErr(''); setHwFile(null); setHSchemeFile(null); setHForm({ id: h.id, title: h.title, homework_url: h.homework_url ?? '', scheme_url: h.scheme_url ?? '' }); }}
                          onDelete={() => deleteSheet(h.id)}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : tab === 'papers' ? (
                papers.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <EmptyState icon={FileTextIcon} title="No papers yet" description="Upload the paper-class paper and its marking scheme on the right." />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    {papers.map((pp, i) => (
                      <div
                        key={pp.id}
                        className={`rise-in flex items-center gap-3 px-4 py-3.5 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''} ${pForm.id === pp.id ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}`}
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <FileTextIcon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-900 truncate">{pp.title}</p>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <FileLink href={pp.paper_url} icon={FileTextIcon} tone="red">Paper PDF</FileLink>
                            <FileLink href={pp.scheme_url} icon={BookOpenIcon}>Marking scheme</FileLink>
                          </div>
                        </div>
                        <RowActions
                          label={pp.title}
                          onEdit={() => { setPErr(''); setPpFile(null); setPSchemeFile(null); setPForm({ id: pp.id, title: pp.title, paper_url: pp.paper_url ?? '', scheme_url: pp.scheme_url ?? '' }); }}
                          onDelete={() => deletePaper(pp.id)}
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : links.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <EmptyState icon={LinkIcon} title="No live links yet" description="Paste a Zoom or Meet link on the right. Students see a change straight away." />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  {links.map((l, i) => (
                    <div
                      key={l.id}
                      className={`rise-in flex items-center gap-3 px-4 py-3.5 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''} ${lForm.id === l.id ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}`}
                      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    >
                      <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <LinkIcon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-900 truncate">{l.label}</p>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-slate-400 hover:text-[#c20f24] hover:underline truncate block"
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {l.url}
                        </a>
                      </div>
                      <RowActions
                        label={l.label}
                        onEdit={() => { setLErr(''); setLForm({ id: l.id, label: l.label ?? '', url: l.url ?? '' }); }}
                        onDelete={() => deleteLink(l.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══ composer ══ */}
            <div className="min-w-0">
              {tab === 'sessions' && (
                <Composer
                  title={vForm.id ? 'Edit session' : 'Add a session'}
                  description={vForm.id ? 'Changes go live as soon as you save.' : 'A YouTube link, PDFs, or both.'}
                  footer={
                    <div className="flex gap-2">
                      {vForm.id && <Button variant="secondary" onClick={resetVideo}>Cancel</Button>}
                      <Button className="flex-1" onClick={saveVideo} disabled={vSaving || !vForm.title.trim()}>
                        {vSaving && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        {vForm.id ? 'Save session' : 'Add session'}
                      </Button>
                    </div>
                  }
                >
                  <div>
                    <label className={labelCls} htmlFor="t-title">Title</label>
                    <input id="t-title" className={inputCls} value={vForm.title} onChange={(e) => setVForm({ ...vForm, title: e.target.value })} placeholder="Week 3 — Networking" />
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="t-yt">YouTube link or ID</label>
                    <input id="t-yt" className={inputCls} value={vForm.youtube} onChange={(e) => setVForm({ ...vForm, youtube: e.target.value })} placeholder="youtu.be/… — optional" />
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="t-dur">Length</label>
                    <input id="t-dur" className={inputCls} value={vForm.duration} onChange={(e) => setVForm({ ...vForm, duration: e.target.value })} placeholder="1 hr 20 mins" />
                  </div>

                  <div>
                    <span className={labelCls}>Section on the course page</span>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                      {VIDEO_KINDS.map(({ key, short }) => {
                        const on = vForm.kind === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setVForm({ ...vForm, kind: key })}
                            className="relative flex-1 h-9 rounded-lg text-[12px] font-bold transition-colors active:scale-[0.98] duration-150"
                          >
                            {on && (
                              <motion.span
                                layoutId="theory-kind-pill"
                                transition={reduce ? { duration: 0 } : SPRING}
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                              />
                            )}
                            <span className={`relative z-10 ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className={labelCls}>PDFs (tute or paper)</span>
                    <TuteAdder onPick={(files) => setTuteFiles((f) => [...f, ...files])} count={vForm.tutes.length + tuteFiles.length} />
                    {(vForm.tutes.length > 0 || tuteFiles.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {vForm.tutes.map((t, i) => (
                          <Chip key={`s${i}`} label={t.name} onRemove={() => setVForm({ ...vForm, tutes: vForm.tutes.filter((_, j) => j !== i) })} />
                        ))}
                        {tuteFiles.map((f, i) => (
                          <Chip key={`q${i}`} label={f.name} pending onRemove={() => setTuteFiles((fs) => fs.filter((_, j) => j !== i))} />
                        ))}
                      </div>
                    )}
                  </div>

                  <FormError>{vErr}</FormError>
                  <FormNote>{vNote}</FormNote>
                </Composer>
              )}

              {tab === 'homework' && (
                <Composer
                  title={hForm.id ? 'Edit sheet' : 'Add a homework sheet'}
                  description="The sheet, and the marking scheme you release later."
                  footer={
                    <div className="flex gap-2">
                      {hForm.id && <Button variant="secondary" onClick={resetSheet}>Cancel</Button>}
                      <Button className="flex-1" onClick={saveSheet} disabled={hSaving || !hForm.title.trim()}>
                        {hSaving && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        {hForm.id ? 'Save sheet' : 'Add sheet'}
                      </Button>
                    </div>
                  }
                >
                  <div>
                    <label className={labelCls} htmlFor="h-title">Title</label>
                    <input id="h-title" className={inputCls} value={hForm.title} onChange={(e) => setHForm({ ...hForm, title: e.target.value })} placeholder="Week 3 — Data structures" />
                  </div>
                  <FilePicker label="Homework sheet" hint="Choose the homework PDF" icon={BookOpenIcon} file={hwFile} existing={hForm.homework_url} onPick={setHwFile} />
                  <FilePicker label="Marking scheme" hint="Choose the scheme PDF" file={hSchemeFile} existing={hForm.scheme_url} onPick={setHSchemeFile} />
                  <FormError>{hErr}</FormError>
                  <FormNote>{hNote}</FormNote>
                </Composer>
              )}

              {tab === 'papers' && (
                <Composer
                  title={pForm.id ? 'Edit paper' : 'Add a paper'}
                  description="Paper-class papers, with their schemes."
                  footer={
                    <div className="flex gap-2">
                      {pForm.id && <Button variant="secondary" onClick={resetPaper}>Cancel</Button>}
                      <Button className="flex-1" onClick={savePaper} disabled={pSaving || !pForm.title.trim()}>
                        {pSaving && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        {pForm.id ? 'Save paper' : 'Add paper'}
                      </Button>
                    </div>
                  }
                >
                  <div>
                    <label className={labelCls} htmlFor="p-title">Title</label>
                    <input id="p-title" className={inputCls} value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} placeholder="Paper class 04 — Databases" />
                  </div>
                  <FilePicker label="Paper" hint="Choose the paper PDF" file={ppFile} existing={pForm.paper_url} onPick={setPpFile} />
                  <FilePicker label="Marking scheme" hint="Choose the scheme PDF" icon={BookOpenIcon} file={pSchemeFile} existing={pForm.scheme_url} onPick={setPSchemeFile} />
                  <FormError>{pErr}</FormError>
                  <FormNote>{pNote}</FormNote>
                </Composer>
              )}

              {tab === 'links' && (
                <Composer
                  title={lForm.id ? 'Edit link' : 'Add a live link'}
                  description="Zoom or Meet. Students see a change immediately."
                  footer={
                    <div className="flex gap-2">
                      {lForm.id && <Button variant="secondary" onClick={resetLink}>Cancel</Button>}
                      <Button className="flex-1" onClick={saveLink} disabled={lSaving || !lForm.url.trim()}>
                        {lSaving && <Loader2Icon className="w-4 h-4 animate-spin" />}
                        {lForm.id ? 'Save link' : 'Add link'}
                      </Button>
                    </div>
                  }
                >
                  <div>
                    <label className={labelCls} htmlFor="l-label">Label</label>
                    <input id="l-label" className={inputCls} value={lForm.label} onChange={(e) => setLForm({ ...lForm, label: e.target.value })} placeholder="Sunday 8 PM" />
                    <p className="text-[11px] text-slate-400 mt-1.5">Left blank, it reads "Join live class".</p>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="l-url">Link</label>
                    <input id="l-url" type="url" inputMode="url" className={inputCls} value={lForm.url} onChange={(e) => setLForm({ ...lForm, url: e.target.value })} placeholder="https://zoom.us/j/…" />
                  </div>
                  <FormError>{lErr}</FormError>
                </Composer>
              )}
            </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── small parts ───────────────────────────────────────────────────── */

/**
 * Picking PDFs one at a time or several at once. The FileList is live, so
 * it is copied before the input is reset — otherwise it empties first.
 */
function TuteAdder({ onPick, count }: { onPick: (files: File[]) => void; count: number }) {
  const [key, setKey] = useState(0);
  return (
    <>
      <input
        key={key}
        id="t-pdfs"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          setKey((k) => k + 1);
          if (picked.length) onPick(picked);
        }}
      />
      <label
        htmlFor="t-pdfs"
        className="w-full h-11 rounded-xl border border-dashed border-slate-300 bg-white text-[13px] font-semibold text-slate-500 hover:border-[#c20f24]/40 hover:text-[#c20f24] flex items-center justify-center gap-2 px-3.5 cursor-pointer transition-colors active:scale-[0.99] duration-150"
      >
        <PlusIcon className="w-4 h-4 shrink-0" />
        {count > 0 ? `${count} attached — add another` : 'Attach a PDF'}
      </label>
    </>
  );
}

function Chip({ label, pending, onRemove }: { label: string; pending?: boolean; onRemove: () => void }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 max-w-full rounded-lg border pl-2.5 pr-1 py-1 text-[11px] font-semibold ${
        pending ? 'bg-red-50 border-red-100 text-[#c20f24]' : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}
    >
      <FileTextIcon className="w-3 h-3 shrink-0 opacity-60" />
      <span className="truncate max-w-[150px]">{label}</span>
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="w-5 h-5 rounded flex items-center justify-center hover:text-red-600 shrink-0">
        <PlusIcon className="w-3 h-3 rotate-45" />
      </button>
    </span>
  );
}
