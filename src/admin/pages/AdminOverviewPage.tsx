import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ReceiptTextIcon,
  UsersIcon,
  LayersIcon,
  PackageIcon,
  ArrowRightIcon,
  VideoIcon,
  CalendarClockIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  Loader2Icon,
  UserPlusIcon,
  BanknoteIcon,
  TrendingUpIcon,
  IdCardIcon,
  ShieldCheckIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Panel, EmptyState, Initials } from '../components/ui';
import { AreaChart, AreaSpark, BarChart, Donut } from '../components/charts';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmtLKR = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

/** Axis labels: 1200000 -> 1.2M, 45000 -> 45k. */
const shortNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : n >= 1_000 ? `${Math.round(n / 1000)}k`
      : String(Math.round(n));

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminOverviewPage() {
  const { adminName } = useOutletContext<{ adminName?: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [packCount, setPackCount] = useState(0);
  const [marks, setMarks] = useState<any[]>([]);
  const [batchMembers, setBatchMembers] = useState<any[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [vBusyId, setVBusyId] = useState<string | null>(null);
  const [idRejectTarget, setIdRejectTarget] = useState<any | null>(null);

  const load = async () => {
    const [{ data: pr }, { data: pay }, { data: bs }, { count: pc }, { data: mk }, { data: bm }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, student_code, program, exam_year, created_at, verification_status, id_front_path, id_back_path, verification_submitted_at, phone').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name'),
      supabase.from('packs').select('id', { count: 'exact', head: true }),
      supabase.from('paper_marks').select('student_id, marks'),
      supabase.from('batch_members').select('student_id, batch_id')
    ]);
    setProfiles(pr ?? []);
    setPayments(pay ?? []);
    setBatches(bs ?? []);
    setPackCount(pc ?? 0);
    setMarks(mk ?? []);
    setBatchMembers(bm ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // realtime: refresh the moment a student submits/updates an ID verification
  useEffect(() => {
    const channel = supabase
      .channel('admin-overview-id-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, p.full_name ?? '—'));
    return (id: string) => m.get(id) ?? 'Student';
  }, [profiles]);

  /* ── derived ── */
  const pending = payments.filter((p) => p.status === 'pending');
  const approved = payments.filter((p) => p.status === 'approved');
  const pendingIds = profiles.filter((p) => p.verification_status === 'pending');

  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const revenueLast30Days = approved
    .filter((p) => new Date(p.created_at) >= thirtyDaysAgo)
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
  // Rolling 30 days against the 30 before it. Comparing calendar months
  // means that on the 2nd of a month you are holding two days up against
  // thirty and calling it a collapse.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);
  const revenuePrev30 = approved
    .filter((p) => {
      const d = new Date(p.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    })
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const revTrendPct = revenuePrev30 > 0
    ? Math.round(((revenueLast30Days - revenuePrev30) / revenuePrev30) * 100)
    : null;
  const revTrend = revTrendPct === null ? null : `${revTrendPct >= 0 ? '+' : ''}${revTrendPct}% vs previous 30 days`;
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
    pendingIds.slice(0, 8).forEach((p) => items.push({
      at: p.verification_submitted_at ?? p.created_at, icon: IdCardIcon, tone: 'bg-rose-50 text-rose-600',
      text: `${p.full_name ?? 'A student'} submitted an ID for verification`
    }));
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 7);
  }, [profiles, payments, pendingIds, nameOf]);

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

  /* ── ID verification actions (same shape as AdminStudentDetailPage) ── */
  const viewIdImages = async (s: any) => {
    const paths = [s.id_front_path, s.id_back_path].filter(Boolean) as string[];
    if (paths.length === 0) return;
    const results = await Promise.all(
      paths.map((p) => supabase.storage.from('id-cards').createSignedUrl(p, 3600))
    );
    results.forEach((r) => {
      if (r.data?.signedUrl) window.open(r.data.signedUrl, '_blank');
    });
  };
  const approveId = async (s: any) => {
    setVBusyId(s.id);
    await supabase
      .from('profiles')
      .update({
        verification_status: 'approved',
        verification_reviewed_by: user?.id ?? null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reject_reason: null
      })
      .eq('id', s.id);
    setVBusyId(null);
    load();
  };
  const doRejectId = async () => {
    if (!idRejectTarget) return;
    setVBusyId(idRejectTarget.id);
    await supabase
      .from('profiles')
      .update({
        verification_status: 'rejected',
        verification_reviewed_by: user?.id ?? null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reject_reason: 'Please re-upload a clearer ID.'
      })
      .eq('id', idRejectTarget.id);
    setVBusyId(null);
    setIdRejectTarget(null);
    load();
  };

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const firstName = adminName ? adminName.split(' ')[0] : null;

  /* ── Headline sentence: only what is actually true today ── */
  const headline = [
    pendingIds.length ? `${pendingIds.length} ID${pendingIds.length === 1 ? '' : 's'} need verifying` : null,
    pending.length ? `${pending.length} payment${pending.length === 1 ? '' : 's'} await your approval` : null,
    regsToday ? `${regsToday} student${regsToday === 1 ? '' : 's'} registered today` : null
  ].filter(Boolean);

  const quickChips = [
    { label: 'Create Batch', to: '/admin/batches', icon: LayersIcon },
    { label: 'Upload Pack', to: '/admin/packs', icon: PackageIcon },
    { label: 'Monthly Recordings', to: '/admin/theory', icon: VideoIcon },
    { label: 'Approve Payments', to: '/admin/payments', icon: ReceiptTextIcon }
  ];

  /* ── Stat tiles. Every number here is read off real rows. ── */
  const tiles = [
    { label: 'Pending ID verifications', value: pendingIds.length, sub: pendingIds.length ? 'Awaiting review' : 'All caught up', delta: null as string | null, icon: IdCardIcon, tint: 'bg-rose-50 text-rose-600', color: '#e11d48', spark: null as number[] | null, to: '/admin/students' },
    { label: 'Pending payments', value: pending.length, sub: pending.length ? 'Waiting approval' : 'All caught up', delta: null, icon: ReceiptTextIcon, tint: 'bg-amber-50 text-amber-600', color: '#d97706', spark: null, to: '/admin/payments' },
    { label: 'Total students', value: profiles.length.toLocaleString(), sub: `+${regsThisMonth} this month`, delta: regsThisMonth ? `+${regsThisMonth}` : null, icon: UsersIcon, tint: 'bg-blue-50 text-blue-600', color: '#2563eb', spark: signupSpark, to: '/admin/students' },
    { label: 'Active batches', value: batches.length, sub: batches.length ? 'Across all programs' : 'None yet', delta: null, icon: LayersIcon, tint: 'bg-violet-50 text-violet-600', color: '#7c3aed', spark: null, to: '/admin/batches' },
    { label: 'Video packs', value: packCount, sub: 'Published', delta: null, icon: PackageIcon, tint: 'bg-emerald-50 text-emerald-600', color: '#059669', spark: null, to: '/admin/packs' },
    { label: 'Revenue · 30 days', value: fmtLKR(revenueLast30Days), sub: 'Approved payments', delta: revTrendPct === null ? null : `${revTrendPct >= 0 ? '+' : ''}${revTrendPct}%`, icon: BanknoteIcon, tint: 'bg-[#c20f24]/10 text-[#c20f24]', color: '#c20f24', spark: revenueSpark, to: '/admin/payments' },
    { label: 'Lifetime revenue', value: fmtLKR(approved.reduce((s, p) => s + Number(p.amount ?? 0), 0)), sub: `${approved.length} approved payment${approved.length === 1 ? '' : 's'}`, delta: null, icon: TrendingUpIcon, tint: 'bg-cyan-50 text-cyan-600', color: '#0891b2', spark: revenueSpark, to: '/admin/payments' },
    { label: "Today's registrations", value: regsToday, sub: regsTodayTrend, delta: regsToday - regsYesterday > 0 ? `+${regsToday - regsYesterday}` : null, icon: UserPlusIcon, tint: 'bg-indigo-50 text-indigo-600', color: '#4f46e5', spark: signupSpark, to: '/admin/students' }
  ];

  const verifiedCount = profiles.filter((p) => p.verification_status === 'approved').length;
  const rejectedCount = profiles.filter((p) => p.verification_status === 'rejected').length;
  const unsubmitted = Math.max(0, profiles.length - verifiedCount - rejectedCount - pendingIds.length);

  const rangeTabs = [
    { v: '30d', label: '30D' },
    { v: '3m', label: '3M' },
    { v: '6m', label: '6M' },
    { v: '12m', label: '12M' },
    { v: 'all', label: 'All' }
  ] as const;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome ───────────────────────────────────────────────── */}
      <section
        className="rise-in relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8 text-white"
        style={{ background: 'linear-gradient(110deg, #7a0c17 0%, #c20f24 55%, #e11d48 100%)' }}
      >
        <div className="pointer-events-none absolute -top-24 -right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/60">{dateLabel}</p>
            <h1 className="text-[32px] sm:text-[38px] leading-tight font-bold tracking-tight mt-1">
              Welcome back{firstName ? `, ${firstName}` : ''} <span className="inline-block">👋</span>
            </h1>
            <p className="text-sm text-white/75 mt-2 max-w-xl">
              {headline.length
                ? `${headline.join(', ')}.`
                : 'Nothing is waiting on you — every payment and ID is reviewed.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {quickChips.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm text-[13px] font-semibold transition-colors active:scale-[0.97] duration-150"
              >
                <c.icon className="w-4 h-4" /> {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stat tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiles.map((t, i) => (
          <Link
            key={t.label}
            to={t.to}
            className="rise-in group relative overflow-hidden rounded-2xl border border-slate-200 bg-white pt-5 hover:border-slate-300 transition-colors"
            style={{ animationDelay: `${60 + i * 40}ms` }}
          >
            <div className="px-5">
              <div className="flex items-start justify-between gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.tint}`}>
                  <t.icon className="w-5 h-5" />
                </span>
                {t.delta && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
                      t.delta.startsWith('-') ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                    }`}
                  >
                    <TrendingUpIcon className={`w-3 h-3 ${t.delta.startsWith('-') ? 'rotate-90' : ''}`} /> {t.delta}
                  </span>
                )}
              </div>

              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4">{t.label}</p>
              <p className="text-[28px] leading-none font-bold text-slate-900 tabular-nums mt-1.5">{t.value}</p>
              {t.sub && <p className="text-[12px] text-slate-400 mt-1.5">{t.sub}</p>}
            </div>

            {/* the spark bleeds to the card edge, so the card has a floor */}
            <div className="mt-3 -mb-px">
              {t.spark && t.spark.length > 1
                ? <AreaSpark points={t.spark} color={t.color} />
                : <div className="h-[42px]" />}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Revenue + verification mix ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 items-start">
        <Panel
          className="rise-in"
          title="Revenue"
          description={`Approved payments · ${revRangeDesc}${revTrend ? ` · ${revTrend}` : ''}`}
          actions={
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {rangeTabs.map((r) => (
                <button
                  key={r.v}
                  onClick={() => setRevRange(r.v)}
                  className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-colors ${
                    revRange === r.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          {/* keyed on range: a new series draws itself rather than morphing */}
          <AreaChart key={revRange} points={revenueSeries} height={260} color="#c20f24" valueFormat={(n) => `Rs ${shortNum(n)}`} />
        </Panel>

        <Panel className="rise-in" title="ID verification" description="Where your students stand">
          <Donut
            centerValue={profiles.length ? `${Math.round((verifiedCount / profiles.length) * 100)}%` : '—'}
            centerLabel="verified"
            segments={[
              { label: 'Verified', value: verifiedCount, color: '#059669' },
              { label: 'Pending', value: pendingIds.length, color: '#d97706' },
              { label: 'Rejected', value: rejectedCount, color: '#e11d48' },
              { label: 'Not submitted', value: unsubmitted, color: '#e2e8f0' }
            ]}
          />
          {pendingIds.length > 0 && (
            <Link
              to="/admin/students"
              className="mt-5 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#c20f24] text-white text-[13px] font-bold hover:bg-[#a60d1f] transition-colors active:scale-[0.98] duration-150"
            >
              Review {pendingIds.length} pending ID{pendingIds.length === 1 ? '' : 's'} <ArrowRightIcon className="w-4 h-4" />
            </Link>
          )}
        </Panel>
      </div>

      {/* ── Growth + batch marks ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel className="rise-in" title="Student growth" description="New registrations per month">
          <AreaChart points={growthBuckets} height={220} color="#2563eb" valueFormat={(n) => String(Math.round(n))} showAverage={false} />
        </Panel>

        <Panel className="rise-in" title="Batch performance" description="Average paper marks by batch">
          {batchPerf.length === 0 ? (
            <EmptyState icon={TrendingUpIcon} title="No marks yet" description="This fills in as you enter paper marks." />
          ) : (
            <BarChart points={batchPerf.map((b) => ({ label: b.name, total: b.avg ?? 0 }))} suffix="%" color="#c20f24" />
          )}
        </Panel>
      </div>

      {/* ── Work queues ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start">
        {/* pending payments */}
        <Panel
          className="rise-in"
          title="Pending payments"
          description="Approve or reject uploaded slips"
          bodyClassName="p-0 mt-4"
          actions={
            <Link to="/admin/payments" className="text-[13px] font-semibold text-[#c20f24] hover:underline inline-flex items-center gap-1">
              View all <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {pending.length === 0 ? (
            <EmptyState icon={ShieldCheckIcon} title="Nothing waiting" description="Every payment slip has been reviewed." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-y border-slate-100">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.slice(0, 6).map((p, i) => (
                    <tr key={p.id} className="rise-in hover:bg-slate-50/60 transition-colors" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Initials name={nameOf(p.student_id)} size={32} />
                          <span className="font-semibold text-slate-900 truncate">{nameOf(p.student_id)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 capitalize">{String(p.kind ?? '').replace('_', ' ') || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 tabular-nums">{fmtLKR(Number(p.amount ?? 0))}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {p.slip_path && (
                            <button
                              onClick={() => viewSlip(p.slip_path)}
                              title="View slip"
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => approve(p)}
                            disabled={busyId === p.id}
                            title="Approve"
                            className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                          >
                            {busyId === p.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setRejectTarget(p)}
                            disabled={busyId === p.id}
                            title="Reject"
                            className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pending.length > 6 && (
                <p className="px-5 py-3 text-[12px] text-slate-400 border-t border-slate-100">
                  Showing 6 of {pending.length}
                </p>
              )}
            </div>
          )}
        </Panel>

        {/* ID verifications */}
        <Panel
          className="rise-in"
          title="ID verifications"
          description="Students waiting to be let in"
          bodyClassName="p-5 pt-4"
        >
          {pendingIds.length === 0 ? (
            <EmptyState icon={ShieldCheckIcon} title="No IDs waiting" description="Every submitted ID has been reviewed." />
          ) : (
            <div className="space-y-2.5">
              {pendingIds.slice(0, 5).map((s, i) => (
                <div
                  key={s.id}
                  className="rise-in flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Initials name={s.full_name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{s.full_name ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[s.student_code, s.program].filter(Boolean).join(' · ') || 'No code yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => viewIdImages(s)}
                      title="View ID"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => approveId(s)}
                      disabled={vBusyId === s.id}
                      title="Approve"
                      className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                    >
                      {vBusyId === s.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIdRejectTarget(s)}
                      disabled={vBusyId === s.id}
                      title="Reject"
                      className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Activity + recent students ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start">
        <Panel className="rise-in" title="Recent activity" description="Everything happening across the platform">
          {activity.length === 0 ? (
            <EmptyState icon={CalendarClockIcon} title="Nothing yet" description="Registrations and payments show up here." />
          ) : (
            <div className="space-y-4">
              {activity.map((a, i) => (
                <div key={`${a.at}-${i}`} className="rise-in flex items-start gap-3" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.tone}`}>
                    <a.icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 leading-snug">{a.text}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(a.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="rise-in"
          title="Recent students"
          description="Latest registrations"
          actions={
            <Link to="/admin/students" className="text-[13px] font-semibold text-[#c20f24] hover:underline inline-flex items-center gap-1">
              View all <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {profiles.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No students yet" />
          ) : (
            <div className="space-y-3.5">
              {profiles.slice(0, 6).map((p, i) => (
                <div key={p.id} className="rise-in flex items-center gap-3" style={{ animationDelay: `${i * 40}ms` }}>
                  <Initials name={p.full_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.full_name ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[p.student_code, p.program, p.exam_year].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(p.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this payment?"
        message={`Reject ${rejectTarget ? nameOf(rejectTarget.student_id) : ''}'s slip of ${rejectTarget ? fmtLKR(Number(rejectTarget.amount ?? 0)) : ''}? The student will see it as rejected.`}
        confirmLabel="Reject"
        onConfirm={doReject}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmDialog
        open={!!idRejectTarget}
        title="Reject this ID?"
        message={`Reject ${idRejectTarget?.full_name ?? 'this student'}'s ID? They'll be asked to re-upload a clearer photo before they can access lessons.`}
        confirmLabel="Reject"
        onConfirm={doRejectId}
        onCancel={() => setIdRejectTarget(null)}
      />
    </div>
  );
}
