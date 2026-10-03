import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  BellIcon,
  VideoIcon,
  RadioIcon,
  MegaphoneIcon,
  TrophyIcon,
  AwardIcon } from
'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Notif = { id: string; title?: string | null; message: string; image?: string | null; type: string; isRead: boolean; timestamp: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-LK', { month: 'short', day: '2-digit' });

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  // The dashboard's navbar is overflow-hidden, which clipped this panel to
  // the height of the bar — the bell toggled and nothing appeared. It is
  // portalled to the body now and positioned against the button, so no
  // ancestor's overflow or stacking context can hide it.
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Right-aligned to the bell by preference, but clamped to the viewport:
    // this bell sits at the LEFT of the dashboard bar, so a 384px panel
    // hung off its right edge lands at left:-10 and is never seen.
    const w = window.innerWidth >= 640 ? 384 : 320;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    setPos({ top: r.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    place();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, place]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      setNotifications((data ?? []).map((n: any) => ({
        id: n.id,
        title: n.title ?? null,
        message: n.message,
        image: n.image_url ?? null,
        type: n.type ?? 'announcement',
        isRead: n.is_read,
        timestamp: fmt(n.created_at)
      })));
    });
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };
  const markAllAsRead = async () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoIcon className="w-4 h-4 text-red-500" />;
      case 'live':
        return <RadioIcon className="w-4 h-4 text-red-500" />;
      case 'rank':
        return <TrophyIcon className="w-4 h-4 text-amber-500" />;
      case 'achievement':
        return <AwardIcon className="w-4 h-4 text-emerald-500" />;
      default:
        return <MegaphoneIcon className="w-4 h-4 text-amber-500" />;
    }
  };
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => { place(); setIsOpen((o) => !o); }}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#c20f24]"
        aria-label="Notifications">

        <BellIcon className="w-6 h-6 text-apple-text" />
        {unreadCount > 0 &&
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        }
      </button>

      {createPortal(
      <AnimatePresence>
        {isOpen &&
        <>
            <div
            className="fixed inset-0 z-[85]"
            onClick={() => setIsOpen(false)} />

            <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 10
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 10
            }}
            transition={{
              duration: 0.2
            }}
            style={{ top: pos?.top ?? 64, left: pos?.left ?? 16 }}
            className="fixed w-80 sm:w-96 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-apple-hover border border-gray-100 z-[90] overflow-hidden">

              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
                <h3 className="font-semibold text-apple-text">Notifications</h3>
                {unreadCount > 0 &&
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#c20f24] font-medium hover:underline">

                    Mark all as read
                  </button>
              }
              </div>

              <div data-lenis-prevent className="max-h-[400px] overflow-y-auto hide-scrollbar">
                {notifications.length > 0 ?
              <div className="flex flex-col">
                    {notifications.map((notification) =>
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${!notification.isRead ? 'bg-red-50/30' : ''}`}>

                        {notification.image ? (
                          <img
                            src={notification.image}
                            alt=""
                            loading="lazy"
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                          />
                        ) : (
                          <div
                            className={`mt-0.5 p-2 rounded-full h-fit flex-shrink-0 ${!notification.isRead ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                            {getIcon(notification.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <p className={`text-sm font-semibold truncate ${!notification.isRead ? 'text-apple-text' : 'text-apple-subtext'}`}>
                              {notification.title}
                            </p>
                          )}
                          <p
                      className={`text-sm ${notification.title ? 'text-apple-subtext line-clamp-2' : !notification.isRead ? 'font-medium text-apple-text' : 'text-apple-subtext'}`}>

                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        {!notification.isRead &&
                  <div className="w-2 h-2 bg-[#c20f24] rounded-full mt-1.5 flex-shrink-0" />
                  }
                      </div>
                )}
                  </div> :

              <div className="p-8 text-center text-apple-subtext">
                    <p>No notifications yet</p>
                  </div>
              }
              </div>
            </motion.div>
          </>
        }
      </AnimatePresence>,
      document.body
      )}
    </div>);

}
