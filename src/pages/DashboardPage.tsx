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
  TrendingUpIcon
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { formatLKR } from '../data/paymentConfig';
import { Badge } from '../components/ui/Badge';
import { MarksChart, type Mark } from '../components/shared/MarksChart';
import { StudyTimeCard } from '../components/shared/StudyTimeCard';

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
  const [payments, setPayments] = useState<any[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: lc }, { data: pays }, { data: mk }] = await Promise.all([
      supabase.from('live_classes').select('*').order('scheduled_at', { ascending: true }),
      supabase.from('payments').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(4),
      supabase.from('paper_marks').select('*').eq('student_id', user.id)
    ]);
    setLive(lc ?? []);
    setPayments(pays ?? []);
    setMarks((mk ?? []) as Mark[]);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const liveNow = live.find((c) => isLiveNow(c.scheduled_at));

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: reduce ? 0 : 0.07 } } };
  const item = reduce ? { hidden: { opacity: 1 }, show: { opacity: 1 } } : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

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

      {/* study time */}
      <motion.section variants={item}>
        <StudyTimeCard />
      </motion.section>

      {/* paper marks */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <TrendingUpIcon className="w-5 h-5 text-apple-blue" />
          <h2 className="text-base sm:text-2xl font-bold text-apple-text dark:text-apple-light">Paper Marks</h2>
        </div>
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <MarksChart marks={marks} />
        </div>
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
