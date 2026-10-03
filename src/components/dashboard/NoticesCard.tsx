import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, ImageIcon, XIcon } from 'lucide-react';
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

const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-LK', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function NoticesCard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  // The card is a column in the rail, far too narrow for a timetable photo,
  // so a notice opens full size rather than being squeezed into it.
  const [open, setOpen] = useState<Notice | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotices = async () => {
      setLoading(true);
      // No student_id filter: RLS already limits this to the student's own
      // rows, their batch's, and the ones posted to everyone. Filtering here
      // threw away every announcement that was not addressed individually.
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // The teacher's announcements come first: XP messages are frequent
      // enough to bury a real notice otherwise, and they have the bell.
      const rows = (data ?? []) as Notice[];
      const announcements = rows.filter((n) => n.type === 'announcement');
      const rest = rows.filter((n) => n.type !== 'announcement');
      setNotices([...announcements, ...rest].slice(0, 3));
      setLoading(false);
    };

    fetchNotices();
  }, [user]);

  // Reading a notice marks it read, so the red dot means "new to you".
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

  return (
    <DashboardCard delay={0.4} className="flex flex-col h-full">
      <DashboardCardHeader>
        <DashboardCardTitle icon={BellIcon}>Important Notices</DashboardCardTitle>
      </DashboardCardHeader>

      <DashboardCardContent className="flex-1 flex flex-col">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <div className="space-y-4 flex-1">
            {notices.map((notice) => (
              <button
                key={notice.id}
                type="button"
                onClick={() => openNotice(notice)}
                className="group relative w-full text-left flex gap-3 rounded-xl -mx-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="shrink-0 mt-1.5">
                  <span className={`w-2 h-2 rounded-full block ${!notice.is_read ? 'bg-[#c20f24]' : 'bg-gray-300 dark:bg-slate-600'}`} />
                </div>

                <div className="min-w-0 flex-1">
                  {notice.title && (
                    <p className="text-sm font-semibold text-[#172033] dark:text-apple-light mb-0.5 truncate group-hover:text-[#c20f24] transition-colors">
                      {notice.title}
                    </p>
                  )}
                  {notice.message && (
                    <p className="text-[12px] text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notice.message}
                    </p>
                  )}

                  {notice.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40">
                      <img
                        src={notice.image_url}
                        alt=""
                        loading="lazy"
                        className="w-full max-h-28 object-cover group-hover:opacity-95 transition-opacity"
                      />
                    </div>
                  )}

                  <p className="text-[10px] uppercase tracking-wider text-[#64748B]/70 mt-1.5 flex items-center gap-1.5">
                    {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {notice.image_url && <ImageIcon className="w-3 h-3" />}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <BellIcon className="w-10 h-10 text-gray-200 dark:text-slate-700 mb-3" />
            <h4 className="text-sm font-semibold text-[#172033] dark:text-white mb-1">No notices available</h4>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-[200px]">Important announcements from your teacher will show up here.</p>
          </div>
        )}
      </DashboardCardContent>

      {/* Full notice. Portalled, so the dashboard's own stacking and the
          rail's overflow cannot clip it. */}
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
