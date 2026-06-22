import { useEffect, useState, useCallback } from 'react';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CircleHelpIcon,
  RadioIcon,
  ShoppingCartIcon,
  ReceiptTextIcon,
  UserIcon,
  VideoIcon,
  LockIcon,
  CalendarIcon
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { loadLibrary, type LibMonth, type LibPack } from '../data/library';
import { formatLKR } from '../data/paymentConfig';
import { Badge } from '../components/ui/Badge';

/* eslint-disable @typescript-eslint/no-explicit-any */

const quickActions = [
  { title: 'My Classes', subtitle: 'Watch your classes', icon: BookOpenIcon, path: '/dashboard/courses', tone: 'bg-[linear-gradient(135deg,#8b5cf6,#6d5bd0)]' },
  { title: 'Live Classes', subtitle: 'Join sessions', icon: VideoIcon, path: '/dashboard/live', tone: 'bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)]' },
  { title: 'Extra Classes', subtitle: 'Browse packs', icon: ShoppingCartIcon, path: '/dashboard/extra-classes', tone: 'bg-[linear-gradient(135deg,#8b5cf6,#6366f1)]' },
  { title: 'Payments', subtitle: 'Slips & history', icon: ReceiptTextIcon, path: '/dashboard/payments', tone: 'bg-[linear-gradient(135deg,#9f67ff,#7c3aed)]' },
  { title: 'My Profile', subtitle: 'Your details', icon: UserIcon, path: '/dashboard/profile', tone: 'bg-[linear-gradient(135deg,#5b67f1,#4f46e5)]' },
  { title: 'Get Help', subtitle: 'Support', icon: CircleHelpIcon, path: '/dashboard/help', tone: 'bg-[linear-gradient(135deg,#6d5bd0,#8b5cf6)]' }
];

const isLiveNow = (iso: string) => {
  const t = new Date(iso).getTime();
  return Date.now() >= t - 10 * 60000 && Date.now() <= t + 3 * 3600000;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const name = user?.name || 'there';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const [live, setLive] = useState<any[]>([]);
  const [packs, setPacks] = useState<LibPack[]>([]);
  const [recordings, setRecordings] = useState<LibMonth[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: lc }, lib, { data: pays }] = await Promise.all([
      supabase.from('live_classes').select('*').order('scheduled_at', { ascending: true }),
      loadLibrary(user.id),
      supabase.from('payments').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(4)
    ]);
    setLive(lc ?? []);
    setPacks(lib.packs);
    setRecordings(lib.recordings);
    setPayments(pays ?? []);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const liveNow = live.find((c) => isLiveNow(c.scheduled_at));
  const upcoming = live.filter((c) => new Date(c.scheduled_at).getTime() > Date.now() - 3 * 3600000).slice(0, 2);
  const classItems = [
    ...packs.map((p) => ({ kind: 'pack' as const, id: p.id, title: p.title, thumb: p.thumbnailUrl, unlocked: true })),
    ...recordings.map((m) => ({ kind: 'month' as const, id: m.id, title: `${m.month} ${m.year}`, thumb: m.thumbnailUrl, unlocked: m.unlocked }))
  ].slice(0, 3);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.07 } } };
  const item = reduce ? { hidden: { opacity: 1 }, show: { opacity: 1 } } : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

  const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-LK', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7 sm:space-y-10">
      {/* identity hero */}
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0f2952,#1a3a6e,#0a2040)] dark:bg-[linear-gradient(135deg,#0b1b38,#13294e,#070f24)] p-5 sm:p-7 text-white shadow-[0_20px_45px_rgba(15,41,82,0.28)]">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={name} className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover ring-2 ring-white/25 shrink-0" />
          ) : (
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/15 ring-2 ring-white/25 flex items-center justify-center text-xl font-bold shrink-0">{initials}</div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-200/70">Welcome back</p>
            <h1 className="text-xl sm:text-3xl font-bold leading-tight truncate">Hi, {name} 👋</h1>
          </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-blue-200/70">Student ID</p>
            <p className="text-lg sm:text-2xl font-bold tracking-wide truncate">{user?.studentId || '—'}</p>
          </div>
          <span className="text-[11px] sm:text-xs text-blue-100/80 text-right leading-snug shrink-0">Use for class<br className="sm:hidden" /> attendance</span>
        </div>
      </motion.section>

      {/* live now banner */}
      {liveNow && (
        <motion.button variants={item} type="button" onClick={() => window.open(liveNow.zoom_link, '_blank')}
          className="w-full text-left flex items-center gap-3 sm:gap-4 rounded-3xl p-4 sm:p-5 bg-[linear-gradient(135deg,#dc2626,#b91c1c)] text-white shadow-[0_14px_34px_rgba(220,38,38,0.3)] active:scale-[0.99] transition-transform">
          <span className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/15 shrink-0">
            <RadioIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white"><span className="absolute inset-0 rounded-full bg-white animate-ping" /></span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-100">● Live now</p>
            <p className="font-bold leading-snug truncate">{liveNow.title}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white text-red-600 font-bold text-sm px-4 py-2">Join</span>
        </motion.button>
      )}

      {/* quick actions */}
      <motion.section variants={item}>
        <h2 className="text-base sm:text-lg font-bold text-apple-text dark:text-apple-light mb-3 sm:mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button key={action.title} type="button" onClick={() => navigate(action.path)}
              className={`group flex flex-col justify-between min-h-[108px] sm:min-h-[124px] rounded-3xl p-4 text-left text-white shadow-[0_10px_24px_rgba(139,92,246,0.18)] active:scale-[0.97] transition-transform touch-manipulation ${action.tone}`}>
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/20"><action.icon className="w-5 h-5 sm:w-6 sm:h-6" /></span>
              <span>
                <span className="block text-sm sm:text-base font-bold leading-tight">{action.title}</span>
                <span className="block text-[11px] text-white/80 leading-snug mt-0.5">{action.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* upcoming live */}
      <motion.section variants={item}>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-2xl font-bold text-apple-text dark:text-apple-light">Upcoming Live Classes</h2>
          <button onClick={() => navigate('/dashboard/live')} className="text-sm font-medium text-apple-blue hover:underline flex items-center gap-1 shrink-0">View all <ArrowRightIcon className="w-4 h-4" /></button>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-6 text-center text-sm text-apple-subtext dark:text-slate-400">No upcoming classes for you right now.</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <div key={c.id} className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-apple-blue flex items-center justify-center shrink-0"><VideoIcon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-apple-text dark:text-apple-light truncate">{c.title}</p>
                  <p className="text-xs text-apple-subtext dark:text-slate-400 mt-0.5 flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {fmtTime(c.scheduled_at)}</p>
                </div>
                <a href={c.zoom_link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-apple-blue text-white text-sm font-semibold px-4 py-2 hover:bg-blue-600">Join</a>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* my classes */}
      <motion.section variants={item}>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-2xl font-bold text-apple-text dark:text-apple-light">My Classes</h2>
          <button onClick={() => navigate('/dashboard/courses')} className="text-sm font-medium text-apple-blue hover:underline flex items-center gap-1 shrink-0">View all <ArrowRightIcon className="w-4 h-4" /></button>
        </div>
        {classItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-6 text-center">
            <p className="text-sm text-apple-subtext dark:text-slate-400 mb-3">Nothing here yet.</p>
            <button onClick={() => navigate('/dashboard/extra-classes')} className="inline-flex items-center gap-2 text-sm font-semibold text-apple-blue hover:underline"><ShoppingCartIcon className="w-4 h-4" /> Browse the store</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {classItems.map((c) => (
              <button key={c.id} type="button"
                onClick={() => (c.kind === 'month' && !c.unlocked ? navigate('/dashboard/payments') : navigate(`/dashboard/watch/${c.id}`))}
                className="group text-left bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-transform">
                <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: '16/9' }}>
                  {c.thumb && <img src={c.thumb} alt="" className={`w-full h-full object-cover ${c.unlocked ? '' : 'opacity-40'}`} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  {!c.unlocked && <span className="absolute inset-0 flex items-center justify-center text-white"><LockIcon className="w-6 h-6" /></span>}
                  <span className="absolute top-3 left-3 text-[11px] font-semibold bg-apple-blue/90 text-white px-2.5 py-1 rounded-full">{c.kind === 'pack' ? 'Pack' : 'Recording'}</span>
                </div>
                <div className="p-4"><h3 className="text-sm font-bold text-apple-text dark:text-apple-light leading-snug line-clamp-2">{c.title}</h3></div>
              </button>
            ))}
          </div>
        )}
      </motion.section>

      {/* recent payments */}
      <motion.section variants={item}>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-2xl font-bold text-apple-text dark:text-apple-light">Recent Payments</h2>
          <button onClick={() => navigate('/dashboard/payments')} className="text-sm font-medium text-apple-blue hover:underline flex items-center gap-1 shrink-0">View all <ArrowRightIcon className="w-4 h-4" /></button>
        </div>
        {payments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-6 text-center text-sm text-apple-subtext dark:text-slate-400">No payments yet.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {payments.map((p) => (
              <div key={p.id} className="p-4 sm:p-5 border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-apple-blue/70">
                    {p.kind === 'monthly_fee' ? `${p.period_month ?? ''} ${p.period_year ?? ''}` : p.kind}
                  </p>
                  <Badge variant={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'}>
                    {p.status === 'approved' ? 'Paid' : p.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </Badge>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-apple-text dark:text-apple-light">{formatLKR(Number(p.amount))}</h3>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
