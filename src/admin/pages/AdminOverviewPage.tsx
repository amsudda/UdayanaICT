import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ReceiptTextIcon,
  UsersIcon,
  LayersIcon,
  PackageIcon,
  ArrowRightIcon,
  PlusIcon,
  VideoIcon,
  CalendarClockIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  Loader2Icon,
  UserPlusIcon,
  BanknoteIcon,
  TrendingUpIcon,
  RadioIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmtLKR = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* tiny sparkline from a numeric series */
function Sparkline({ data, stroke = '#2563eb' }: { data: number[]; stroke?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - (v / max) * 24 - 2}`).join(' ');
  return (
    <svg viewBox="0 0 100 28" className="w-full h-7" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/* monthly revenue area chart */
function TrendAreaChart({ buckets, color, id, label }: { buckets: { label: string; total: number }[]; color: string; id: string; label: string }) {
  const W = 620, H = 200, PAD = 34;
  const max = Math.max(...buckets.map((b) => b.total), 1);
  const x = (i: number) => PAD + (i / Math.max(buckets.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - 30 - (v / max) * (H - 60);
  const line = buckets.map((b, i) => `${x(i)},${y(b.total)}`).join(' ');
  const area = `${PAD},${H - 30} ${line} ${x(buckets.length - 1)},${H - 30}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={PAD} x2={W - PAD} y1={y(max * t)} y2={y(max * t)} stroke="#e2e8f0" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {buckets.map((b, i) => {
        const step = Math.max(1, Math.ceil(buckets.length / 7));
        const showLabel = i % step === 0 || i === buckets.length - 1;
        return (
          <g key={`${b.label}-${i}`}>
            <circle cx={x(i)} cy={y(b.total)} r={buckets.length > 14 ? 2 : 3.5} fill={color} />
            {showLabel && <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#94a3b8">{b.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function AdminOverviewPage() {
  const { adminName } = useOutletContext<{ adminName?: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [packCount, setPackCount] = useState(0);
  const [liveNext, setLiveNext] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [batchMembers, setBatchMembers] = useState<any[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    const nowIso = new Date().toISOString();
    const [{ data: pr }, { data: pay }, { data: bs }, { count: pc }, { data: lc }, { data: mk }, { data: bm }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, student_code, program, exam_year, created_at').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name'),
      supabase.from('packs').select('id', { count: 'exact', head: true }),
      supabase.from('live_classes').select('*').gt('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).limit(3),
      supabase.from('paper_marks').select('student_id, marks'),
      supabase.from('batch_members').select('student_id, batch_id')
    ]);
    setProfiles(pr ?? []);
    setPayments(pay ?? []);
    setBatches(bs ?? []);
    setPackCount(pc ?? 0);
    setLiveNext(lc ?? []);
    setMarks(mk ?? []);
    setBatchMembers(bm ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // 1s ticker for the next-class countdown
  useEffect(() => {
    if (!liveNext.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [liveNext.length]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.full_name ?? '—'));
    return (id: string) => m.get(id) ?? 'Student';
  }, [profiles]);

  /* ── derived ── */
  const pending = payments.filter((p) => p.status === 'pending');
  const approved = payments.filter((p) => p.status === 'approved');

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thisMonth = monthKey(new Date());
  const revenueThisMonth = approved
    .filter((p) => monthKey(new Date(p.created_at)) === thisMonth)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const todayStr = new Date().toDateString();
  const regsToday = profiles.filter((p) => new Date(p.created_at).toDateString() === todayStr).length;

  // sparkline: signups per day, last 14 days
  const signupSpark = useMemo(() => {
    const days: number[] = Array(14).fill(0);
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 13);
    profiles.forEach((p) => {
      const diff = Math.floor((new Date(p.created_at).getTime() - start.getTime()) / 86_400_000);
      if (diff >= 0 && diff < 14) days[diff]++;
    });
    return days;
  }, [profiles]);

  // revenue buckets: last 6 months
  const revenueBuckets = useMemo(() => {
    const out: { label: string; total: number; key: string }[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ label: m.toLocaleString('en', { month: 'short' }), total: 0, key: monthKey(m) });
    }
    approved.forEach((p) => {
      const k = monthKey(new Date(p.created_at));
      const b = out.find((x) => x.key === k);
      if (b) b.total += Number(p.amount ?? 0);
    });
    return out;
  }, [approved]);

  const revenueSpark = revenueBuckets.map((b) => b.total);

  // revenue chart range filter
  const [revRange, setRevRange] = useState<'30d' | '3m' | '6m' | '12m' | 'all'>('6m');
  const revenueSeries = useMemo(() => {
    if (revRange === '30d') {
      const out: { label: string; total: number; key: string }[] = [];
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 29);
      for (let i = 0; i < 30; i++) {
        const d = new Date(start.getTime() + i * 86_400_000);
        out.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, total: 0, key: d.toDateString() });
      }
      approved.forEach((p) => {
        const b = out.find((x) => x.key === new Date(p.created_at).toDateString());
        if (b) b.total += Number(p.amount ?? 0);
      });
      return out;
    }
    let months: number;
    if (revRange === 'all') {
      const first = approved.length ? new Date(Math.min(...approved.map((p) => +new Date(p.created_at)))) : new Date();
      const n = new Date();
      months = Math.max((n.getFullYear() - first.getFullYear()) * 12 + (n.getMonth() - first.getMonth()) + 1, 2);
    } else {
      months = revRange === '3m' ? 3 : revRange === '6m' ? 6 : 12;
    }
    const out: { label: string; total: number; key: string }[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = months - 1; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({
        label: m.toLocaleString('en', { month: 'short' }) + (months > 12 ? ` '${String(m.getFullYear()).slice(2)}` : ''),
        total: 0,
        key: monthKey(m)
      });
    }
    approved.forEach((p) => {
      const b = out.find((x) => x.key === monthKey(new Date(p.created_at)));
      if (b) b.total += Number(p.amount ?? 0);
    });
    return out;
  }, [approved, revRange]);
  const revRangeTotal = revenueSeries.reduce((s, b) => s + b.total, 0);
  const revRangeDesc = { '30d': 'last 30 days', '3m': 'last 3 months', '6m': 'last 6 months', '12m': 'last 12 months', all: 'lifetime' }[revRange];

  // student growth: new registrations per month, last 7 months
  const growthBuckets = useMemo(() => {
    const out: { label: string; total: number; key: string }[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = 6; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push({ label: m.toLocaleString('en', { month: 'short' }), total: 0, key: monthKey(m) });
    }
    profiles.forEach((p) => {
      const k = monthKey(new Date(p.created_at));
      const b = out.find((x) => x.key === k);
      if (b) b.total++;
    });
    return out;
  }, [profiles]);

  // trend chips (real month-over-month / day-over-day deltas)
  const regsThisMonth = growthBuckets[growthBuckets.length - 1]?.total ?? 0;
  const revNow = revenueBuckets[revenueBuckets.length - 1]?.total ?? 0;
  const revPrev = revenueBuckets[revenueBuckets.length - 2]?.total ?? 0;
  const revTrend = revPrev > 0 ? `${revNow >= revPrev ? '+' : ''}${Math.round(((revNow - revPrev) / revPrev) * 100)}% vs last month` : null;
  const yesterdayStr = new Date(Date.now() - 86_400_000).toDateString();
  const regsYesterday = profiles.filter((p) => new Date(p.created_at).toDateString() === yesterdayStr).length;
  const regsTodayTrend = `${regsToday - regsYesterday >= 0 ? '+' : ''}${regsToday - regsYesterday} vs yesterday`;

  // activity feed: signups + payments merged
  const activity = useMemo(() => {
    const items: { at: string; icon: any; tone: string; text: string }[] = [];
    profiles.slice(0, 8).forEach((p) => items.push({
      at: p.created_at, icon: UserPlusIcon, tone: 'bg-blue-50 text-blue-600',
      text: `New student registered — ${p.full_name ?? 'student'}`
    }));
    payments.slice(0, 8).forEach((p) => items.push({
      at: p.created_at, icon: BanknoteIcon, tone: 'bg-emerald-50 text-emerald-600',
      text: `Payment ${p.status === 'pending' ? 'received' : p.status} — ${fmtLKR(Number(p.amount ?? 0))} from ${nameOf(p.student_id)}`
    }));
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 7);
  }, [profiles, payments, nameOf]);

  // batch performance: avg paper marks per batch
  const batchPerf = useMemo(() => {
    if (!marks.length || !batchMembers.length) return [];
    const byStudent = new Map<string, string[]>();
    batchMembers.forEach((bm) => {
      const arr = byStudent.get(bm.student_id) ?? [];
      arr.push(bm.batch_id);
      byStudent.set(bm.student_id, arr);
    });
    const agg = new Map<string, { sum: number; n: number }>();
    marks.forEach((m) => {
      (byStudent.get(m.student_id) ?? []).forEach((bid) => {
        const a = agg.get(bid) ?? { sum: 0, n: 0 };
        a.sum += Number(m.marks ?? 0); a.n++;
        agg.set(bid, a);
      });
    });
    return batches
      .map((b) => ({ name: b.name, avg: agg.get(b.id) ? Math.round(agg.get(b.id)!.sum / agg.get(b.id)!.n) : null, n: agg.get(b.id)?.n ?? 0 }))
      .filter((b) => b.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
      .slice(0, 5);
  }, [marks, batchMembers, batches]);

  /* ── payment actions (same as Payments page) ── */
  const approve = async (p: any) => {
    setBusyId(p.id);
    await supabase.from('payments').update({ status: 'approved', reviewed_by: user?.id }).eq('id', p.id);
    setBusyId(null);
    load();
  };
  const doReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    await supabase.from('payments').update({ status: 'rejected', reviewed_by: user?.id }).eq('id', rejectTarget.id);
    setBusyId(null);
    setRejectTarget(null);
    load();
  };
  const viewSlip = async (path: string) => {
    const { data } = await supabase.storage.from('slips').createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  /* next-class countdown */
  const nextClass = liveNext[0];
  const countdown = useMemo(() => {
    if (!nextClass) return null;
    let s = Math.max(0, Math.floor((new Date(nextClass.scheduled_at).getTime() - now) / 1000));
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 99 ? `${h}h` : `${pad(h)} : ${pad(m)} : ${pad(s)}`;
  }, [nextClass, now]);

  const quickActions = [
    { title: 'Create Batch', desc: 'Start a new batch', to: '/admin/batches', icon: LayersIcon, tone: 'bg-violet-50 text-violet-600 border-violet-100' },
    { title: 'Upload Pack', desc: 'Add learning content', to: '/admin/packs', icon: PackageIcon, tone: 'bg-blue-50 text-blue-600 border-blue-100' },
    { title: 'Schedule Live Class', desc: 'Plan a live session', to: '/admin/live', icon: VideoIcon, tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { title: 'Approve Payments', desc: 'Review pending slips', to: '/admin/payments', icon: ReceiptTextIcon, tone: 'bg-amber-50 text-amber-600 border-amber-100' }
  ];

  const stats = [
    { label: 'Pending Payments', value: pending.length, icon: ReceiptTextIcon, to: '/admin/payments', tone: pending.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500', spark: null as number[] | null, sparkColor: '', trend: pending.length > 0 ? 'awaiting approval' : 'all caught up' },
    { label: 'Students', value: profiles.length, icon: UsersIcon, to: '/admin/students', tone: 'bg-blue-50 text-blue-600', spark: signupSpark, sparkColor: '#2563eb', trend: `+${regsThisMonth} this month` },
    { label: 'Active Batches', value: batches.length, icon: LayersIcon, to: '/admin/batches', tone: 'bg-violet-50 text-violet-600', spark: null, sparkColor: '', trend: null as string | null },
    { label: 'Video Packs', value: packCount, icon: PackageIcon, to: '/admin/packs', tone: 'bg-emerald-50 text-emerald-600', spark: null, sparkColor: '', trend: null },
    { label: 'Revenue (This Month)', value: fmtLKR(revenueThisMonth), icon: BanknoteIcon, to: '/admin/payments', tone: 'bg-rose-50 text-rose-600', spark: revenueSpark, sparkColor: '#e11d48', trend: revTrend },
    { label: "Today's Registrations", value: regsToday, icon: UserPlusIcon, to: '/admin/students', tone: 'bg-cyan-50 text-cyan-600', spark: signupSpark, sparkColor: '#0891b2', trend: regsTodayTrend }
  ];

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{adminName ? `, ${adminName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">Keep inspiring, keep teaching. Here's today at a glance.</p>
        </div>
        <p className="text-sm text-slate-400">{dateLabel}</p>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {quickActions.map((a) => (
          <Link key={a.title} to={a.to}
            className={`group flex items-center justify-between rounded-2xl border bg-white p-4 hover:shadow-md transition-all ${a.tone.split(' ')[2] ?? 'border-slate-200'}`}>
            <span className="flex items-center gap-3 min-w-0">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.tone.split(' ').slice(0, 2).join(' ')}`}>
                <a.icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 truncate">{a.title}</span>
                <span className="block text-xs text-slate-400 truncate">{a.desc}</span>
              </span>
            </span>
            <PlusIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group rounded-2xl bg-white border border-slate-200 p-4 hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.tone}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900 leading-none truncate">{loading ? '—' : s.value}</p>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">{s.label}</p>
            {!loading && s.trend ? (
              <p className={`text-[10px] font-semibold mt-1 truncate ${s.trend.startsWith('+') || s.trend === 'all caught up' ? 'text-emerald-600' : s.trend.startsWith('-') ? 'text-red-500' : 'text-slate-400'}`}>
                {s.trend}
              </p>
            ) : null}
            {s.spark && s.spark.some((v) => v > 0) ? (
              <div className="mt-2"><Sparkline data={s.spark} stroke={s.sparkColor} /></div>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-start">
        {/* ── LEFT column ── */}
        <div className="space-y-6 min-w-0">
          {/* revenue */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <h2 className="font-bold text-slate-900">Revenue Overview</h2>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                {([['30d', '30D'], ['3m', '3M'], ['6m', '6M'], ['12m', '12M'], ['all', 'All']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRevRange(key)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors ${revRange === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mb-3">
              {fmtLKR(revRangeTotal)} <span className="text-sm font-medium text-slate-400">{revRangeDesc} · approved payments</span>
            </p>
            <TrendAreaChart buckets={revenueSeries} color="#2563eb" id="revfill" label="Revenue" />
          </div>

          {/* student growth */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-slate-900">Student Growth</h2>
              <span className="text-xs text-slate-400">new registrations · last 7 months</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mb-3">{regsThisMonth} <span className="text-sm font-medium text-slate-400">joined this month</span></p>
            <TrendAreaChart buckets={growthBuckets} color="#059669" id="growfill" label="Student growth" />
          </div>

          {/* pending payments */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Pending Payments</h2>
              <Link to="/admin/payments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRightIcon className="w-3 h-3" /></Link>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nothing to approve — all caught up 🎉</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending.slice(0, 5).map((p) => (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{nameOf(p.student_id)}</p>
                      <p className="text-xs text-slate-400">{p.kind === 'pack' ? 'Video pack' : p.kind === 'theory' ? 'Monthly recordings' : p.kind} · {new Date(p.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 shrink-0">{fmtLKR(Number(p.amount ?? 0))}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => viewSlip(p.slip_url)} disabled={!p.slip_url} title="View slip"
                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => approve(p)} disabled={busyId === p.id} title="Approve"
                        className="w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center">
                        {busyId === p.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setRejectTarget(p)} disabled={busyId === p.id} title="Reject"
                        className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {pending.length > 5 && (
                  <p className="pt-3 text-xs text-slate-400 text-center">
                    Showing 5 of {pending.length} — <Link to="/admin/payments" className="font-semibold text-blue-600 hover:underline">view the rest</Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* recent activity */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <div className="space-y-3.5">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tone}`}>
                      <a.icon className="w-4 h-4" />
                    </span>
                    <p className="text-sm text-slate-700 flex-1 min-w-0 truncate">{a.text}</p>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(a.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT column ── */}
        <div className="space-y-6 min-w-0">
          {/* upcoming live classes */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Upcoming Live Classes</h2>
              <Link to="/admin/live" className="text-xs font-semibold text-blue-600 hover:underline">View all</Link>
            </div>
            {liveNext.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No upcoming classes scheduled.</p>
            ) : (
              <div className="space-y-3">
                {nextClass && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                    <p className="text-xs font-semibold text-blue-600 mb-1">Next class in</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums tracking-wide">{countdown}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{nextClass.title}</p>
                    {nextClass.zoom_link && (
                      <a href={nextClass.zoom_link} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-2 w-full h-10 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                        <RadioIcon className="w-4 h-4" /> Join Meeting
                      </a>
                    )}
                  </div>
                )}
                {liveNext.slice(1).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="w-12 shrink-0 text-center rounded-lg bg-slate-50 border border-slate-100 py-1.5">
                      <p className="text-[9px] font-bold uppercase text-slate-400">{new Date(c.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                      <p className="text-xs font-bold text-slate-700">{new Date(c.scheduled_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                      {c.course_label && <p className="text-xs text-slate-400 truncate">{c.course_label}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* recent students */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Recent Students</h2>
              <Link to="/admin/students" className="text-xs font-semibold text-blue-600 hover:underline">View all</Link>
            </div>
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-400">No students yet.</p>
            ) : (
              <div className="space-y-3">
                {profiles.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {(p.full_name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{[p.student_code, p.program, p.exam_year].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* batch performance */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUpIcon className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-900">Batch Performance</h2>
            </div>
            {batchPerf.length === 0 ? (
              <p className="text-sm text-slate-400">Appears once paper marks are entered.</p>
            ) : (
              <div className="space-y-3.5">
                {batchPerf.map((b) => (
                  <div key={b.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 truncate">{b.name}</span>
                      <span className="font-bold text-slate-900 shrink-0">{b.avg}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(b.avg ?? 0, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.n} mark{b.n === 1 ? '' : 's'} recorded</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* upcoming schedule hint */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClockIcon className="w-4 h-4 text-slate-400" />
              <h2 className="font-bold text-slate-900 text-sm">Getting started</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a batch → upload a pack targeted at it → approve payments to unlock content for students.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this payment?"
        message={`Reject ${rejectTarget ? nameOf(rejectTarget.student_id) : ''}'s slip of ${rejectTarget ? fmtLKR(Number(rejectTarget.amount ?? 0)) : ''}? The student will see it as rejected.`}
        confirmLabel="Reject"
        onConfirm={doReject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
