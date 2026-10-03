import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MegaphoneIcon, XIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { DashboardCard, DashboardCardHeader, DashboardCardTitle, DashboardCardContent } from './DashboardCard';

interface Notice {
  id: string;
  title: string | null;
  message: string | null;
  image_url?: string | null;
  created_at: string;
  type: string;
  is_read: boolean;
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-LK', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

/**
 * The notice board.
 *
 * Only the teacher's own announcements appear here. XP and achievement
 * messages used to share the space and, being far more frequent, pushed a
 * real notice out of sight within a day — they live in the bell now.
 *
 * A notice is usually a picture (a timetable, a hall list), so the newest
 * one is shown as a post with its image, and the ones behind it as compact
 * rows with a thumbnail. Tapping any of them opens it full size.
 */
export function NoticesCard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Notice | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      setLoading(true);
      // No student_id filter: RLS already limits this to the student's own
      // rows, their batch's, and the ones posted to everyone.
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'announcement')
        .order('created_at', { ascending: false })
        .limit(4);

      setNotices((data ?? []) as Notice[]);
      setLoading(false);
    };

    fetchNotices();
  }, [user]);

  // Reading a notice marks it read, so the dot means "new to you".
  const openNotice = async (n: Notice) => {
    setOpen(n);
    if (n.is_read) return;
    setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const unread = notices.filter((n) => !n.is_read).length;
  const [lead, ...rest] = notices;

  return (
    <DashboardCard delay={0.4} className="flex flex-col h-full">
      <DashboardCardHeader>
        <DashboardCardTitle icon={MegaphoneIcon}>Notice Board</DashboardCardTitle>
        {unread > 0 && (
          <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#c20f24] px-2 py-1 rounded-full shrink-0">
            {unread} new
          </span>
        )}
      </DashboardCardHeader>

      <DashboardCardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse space-y-2">
              <div className="h-32 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-3/4" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-gray-100 dark:bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <MegaphoneIcon className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
            <h4 className="text-sm font-semibold text-[#172033] dark:text-white mb-1">No notices yet</h4>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-[220px]">
              Announcements from your teacher — timetables, class changes, results — appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── The newest notice, as a post ── */}
            <button
              type="button"
              onClick={() => openNotice(lead)}
              className="group block w-full text-left"
            >
              {lead.image_url && (
                <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 mb-3">
                  <img
                    src={lead.image_url}
                    alt=""
                    className="w-full aspect-[16/10] object-cover transition-transform duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]"
                  />
                  {!lead.is_read && (
                    <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider text-white bg-[#c20f24] px-2 py-1 rounded-full shadow-sm">
                      New
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2">
                {!lead.image_url && !lead.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#c20f24] mt-1.5 shrink-0" />
                )}
                <div className="min-w-0">
                  {lead.title && (
                    <p className="text-[15px] font-bold text-[#172033] dark:text-white leading-snug group-hover:text-[#c20f24] transition-colors line-clamp-2">
                      {lead.title}
                    </p>
                  )}
                  {lead.message && (
                    <p className="text-[12.5px] text-[#64748B] dark:text-slate-400 leading-relaxed mt-1 line-clamp-2">
                      {lead.message}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-[#64748B]/70 mt-2">{shortDate(lead.created_at)}</p>
                </div>
              </div>
            </button>

            {/* ── Older ones, compact ── */}
            {rest.length > 0 && (
              <div className="pt-3 border-t border-gray-50 dark:border-slate-800/60 space-y-2">
                {rest.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotice(n)}
                    className="group flex items-start gap-3 w-full text-left rounded-xl -mx-2 px-2 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {n.image_url ? (
                      <img
                        src={n.image_url}
                        alt=""
                        loading="lazy"
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-800 shrink-0"
                      />
                    ) : (
                      <span className="w-12 h-12 rounded-xl bg-[#c20f24]/[0.06] text-[#c20f24] flex items-center justify-center shrink-0">
                        <MegaphoneIcon className="w-5 h-5" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#c20f24] shrink-0" />}
                        <span className="text-[13px] font-semibold text-[#172033] dark:text-apple-light truncate group-hover:text-[#c20f24] transition-colors">
                          {n.title || n.message || 'Notice'}
                        </span>
                      </span>
                      <span className="block text-[10px] uppercase tracking-wider text-[#64748B]/70 mt-1">
                        {shortDate(n.created_at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DashboardCardContent>

      {/* Full notice. Portalled, so the rail's overflow cannot clip it. */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setOpen(null)}
            >
              <motion.div
                initial={{ opacity: 0, transform: 'translateY(12px) scale(0.98)' }}
                animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                exit={{ opacity: 0, transform: 'translateY(8px) scale(0.99)' }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                onClick={(e) => e.stopPropagation()}
                data-lenis-prevent
                className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl"
              >
                <button
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shadow-sm z-10"
                >
                  <XIcon className="w-4 h-4" />
                </button>

                {open.image_url && (
                  <img
                    src={open.image_url}
                    alt=""
                    className="w-full max-h-[55vh] object-contain bg-slate-50 dark:bg-slate-800 rounded-t-3xl"
                  />
                )}

                <div className="p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c20f24] mb-2">Notice</p>
                  {open.title && (
                    <h3 className="text-xl font-bold text-[#172033] dark:text-white leading-snug mb-2">{open.title}</h3>
                  )}
                  {open.message && (
                    <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{open.message}</p>
                  )}
                  <p className="text-[11px] text-[#64748B]/80 mt-4">{longDate(open.created_at)}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </DashboardCard>
  );
}
