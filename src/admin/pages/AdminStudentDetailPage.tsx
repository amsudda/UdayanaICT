import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheckIcon, CalendarIcon, CheckIcon, FilmIcon,
  Loader2Icon, LockIcon, ShieldAlertIcon,
  UserIcon, XCircleIcon,
  SearchIcon, EditIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { formatLKR } from '../../data/paymentConfig';
import { ConfirmDialog } from '../components/ConfirmDialog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        on ? 'bg-emerald-500' : 'bg-slate-200'
      }`}
    >
      <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: admin } = useAuth();

  const [student, setStudent] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchIds, setBatchIds] = useState<Set<string>>(new Set());
  const [packs, setPacks] = useState<any[]>([]);
  const [months, setMonths] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [packEnr, setPackEnr] = useState<Record<string, {id: string, source_payment_id: string|null}>>({});
  const [monthEnr, setMonthEnr] = useState<Record<string, {id: string, source_payment_id: string|null}>>({});
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'academic' | 'payments'>('overview');
  const [accessSearch, setAccessSearch] = useState('');

  // ID verification
  const [idUrls, setIdUrls] = useState<{ front?: string; back?: string }>({});
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [vBusy, setVBusy] = useState(false);

  // delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const setBusyKey = (k: string, v: boolean) => setBusy((p) => {
    const n = new Set(p);
    v ? n.add(k) : n.delete(k);
    return n;
  });

  const loadEnrollments = useCallback(async () => {
    const { data: enr } = await supabase.from('enrollments').select('id, pack_id, theory_month_id, source_payment_id').eq('student_id', id);
    const pe: Record<string, any> = {};
    const me: Record<string, any> = {};
    (enr ?? []).forEach((e: any) => {
      if (e.pack_id) pe[e.pack_id] = { id: e.id, source_payment_id: e.source_payment_id };
      if (e.theory_month_id) me[e.theory_month_id] = { id: e.id, source_payment_id: e.source_payment_id };
    });
    setPackEnr(pe);
    setMonthEnr(me);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: s }, { data: bs }, { data: ps }, { data: ms }, { data: pays }, { data: qa }] = await Promise.all([
      supabase.from('profiles').select('*, batch_members(batch:batches(id,name,program,exam_year))').eq('id', id).maybeSingle(),
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name'),
      supabase.from('packs').select('id,title,type,thumbnail_url,price,is_free').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('theory_months').select('id,month,year,thumbnail_url,session_count,price').eq('is_published', true).order('year', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('*, quiz:quizzes(title)').eq('student_id', id).eq('status', 'submitted').order('submitted_at', { ascending: false })
    ]);

    if (!s) { setNotFound(true); setLoading(false); return; }
    
    setStudent(s);
    setBatchIds(new Set((s.batch_members ?? []).map((m: any) => m.batch?.id).filter(Boolean)));
    setBatches(bs ?? []);
    setPacks(ps ?? []);
    setMonths(ms ?? []);
    setPayments(pays ?? []);
    setQuizAttempts(qa ?? []);
    setPaidMonths(new Set((pays ?? []).filter((p: any) => p.kind === 'monthly_fee' && p.status === 'approved').map((p: any) => `${p.period_month}-${p.period_year}`)));
    
    await loadEnrollments();

    if (s.id_front_path || s.id_back_path) {
      const [f, b] = await Promise.all([
        s.id_front_path ? supabase.storage.from('id-cards').createSignedUrl(s.id_front_path, 3600) : Promise.resolve({ data: null }),
        s.id_back_path ? supabase.storage.from('id-cards').createSignedUrl(s.id_back_path, 3600) : Promise.resolve({ data: null })
      ]);
      setIdUrls({ front: (f.data as any)?.signedUrl, back: (b.data as any)?.signedUrl });
    } else {
      setIdUrls({});
    }

    setLoading(false);
  }, [id, loadEnrollments]);

  useEffect(() => { load(); }, [load]);

  const toggleBatch = async (batchId: string) => {
    const key = `b:${batchId}`;
    setBusyKey(key, true);
    if (batchIds.has(batchId)) {
      await supabase.from('batch_members').delete().eq('batch_id', batchId).eq('student_id', id);
      setBatchIds((p) => { const n = new Set(p); n.delete(batchId); return n; });
    } else {
      await supabase.from('batch_members').insert({ batch_id: batchId, student_id: id });
      setBatchIds((p) => new Set([...p, batchId]));
    }
    setBusyKey(key, false);
  };

  const decideVerification = async (status: 'approved' | 'rejected') => {
    setVBusy(true);
    await supabase.from('profiles').update({
      verification_status: status,
      verification_reviewed_by: admin?.id ?? null,
      verification_reviewed_at: new Date().toISOString(),
      verification_reject_reason: status === 'rejected' ? rejectReason.trim() || 'Please re-upload a clearer ID.' : null
    }).eq('id', id);
    
    setStudent((s: any) => ({ ...s, verification_status: status }));
    setShowReject(false);
    setVBusy(false);
  };

  const grant = async (key: string, payload: any) => {
    setBusyKey(key, true);
    await supabase.from('enrollments').insert({ student_id: id, ...payload });
    await loadEnrollments();
    setBusyKey(key, false);
  };

  const revoke = async (key: string, enrId: string) => {
    setBusyKey(key, true);
    await supabase.from('enrollments').delete().eq('id', enrId);
    await loadEnrollments();
    setBusyKey(key, false);
  };

  const handleDelete = async () => {
    setDeleting(true); setDeleteError('');
    const { error } = await supabase.rpc('delete_user', { user_id: id });
    setDeleting(false);
    if (error) setDeleteError(error.message);
    else navigate('/admin/students', { replace: true });
  };

  // derived state
  const vStatus = student?.verification_status;
  const vChip = vStatus === 'approved' ? { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: BadgeCheckIcon } :
                vStatus === 'rejected' ? { label: 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-600/20', icon: XCircleIcon } :
                vStatus === 'pending' && student?.id_front_path ? { label: 'Pending Review', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: Loader2Icon } :
                { label: 'Not verified', cls: 'bg-slate-100 text-slate-500 ring-slate-200', icon: ShieldAlertIcon };

  const studentBatches = batches.filter(b => batchIds.has(b.id));
  const inBatch = studentBatches.length > 0;
  
  const grantedCount = Object.keys(packEnr).length + Object.keys(monthEnr).length;

  const packState = (p: any) => {
    const enr = packEnr[p.id];
    if (enr && !enr.source_payment_id) return 'granted';
    if (enr && enr.source_payment_id) return 'paid';
    return 'none';
  };
  const monthState = (m: any) => {
    const enr = monthEnr[m.id];
    if (enr && !enr.source_payment_id) return 'granted';
    if (paidMonths.has(`${m.month}-${m.year}`) || (enr && enr.source_payment_id)) return 'paid';
    return 'none';
  };

  const filteredPacks = packs.filter(p => accessSearch === '' || p.title.toLowerCase().includes(accessSearch.toLowerCase()));
  const filteredMonths = months.filter(m => accessSearch === '' || `${m.month} ${m.year}`.toLowerCase().includes(accessSearch.toLowerCase()));

  const monthsByYear = useMemo(() => {
    const map = new Map<number, any[]>();
    filteredMonths.forEach(m => {
      const y = m.year;
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredMonths]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2Icon className="w-8 h-8 animate-spin text-slate-300" /></div>;
  if (notFound) return <div className="p-10 text-center text-slate-500">Student not found.</div>;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* 1. STUDENT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/admin/students" className="hover:text-slate-900 transition-colors">Students</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{student.full_name || 'Unnamed'}</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 shadow-sm flex items-center justify-center text-2xl font-bold text-slate-400 uppercase">
              {student.full_name?.charAt(0) || <UserIcon className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.full_name || 'Unnamed Student'}</h1>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${vChip.cls}`}>
                  <vChip.icon className="w-3.5 h-3.5" /> {vChip.label}
                </span>
              </div>
              <p className="text-sm font-mono text-slate-500 mb-2">{student.student_code || 'No ID'}</p>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="px-2 py-1 bg-slate-100 rounded-lg">{student.program || 'No Program'} {student.exam_year || ''}</span>
                {studentBatches.length > 0 && <span className="px-2 py-1 bg-slate-100 rounded-lg">{studentBatches[0].name} {studentBatches.length > 1 ? `+${studentBatches.length-1}` : ''}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="flex gap-6 pr-6 border-r border-slate-200">
              <div>
                <p className="text-xl font-bold text-slate-900">{packs.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Packages</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{payments.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Payments</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{quizAttempts.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Quizzes</p>
              </div>
            </div>
            <button onClick={() => navigate(`/admin/students/${id}/edit`)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <EditIcon className="w-4 h-4" /> Edit Student
            </button>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY PROFILE NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'access', label: 'Access' },
          { id: 'academic', label: 'Academic' },
          { id: 'payments', label: 'Payments' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors relative ${activeTab === tab.id ? 'text-[#c20f24]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c20f24]" />}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* 5. STUDENT INFORMATION */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Student Information</h2>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm text-slate-900 font-medium">{student.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm text-slate-900 font-medium">{student.phone || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                      <p className="text-sm text-slate-900 font-medium">{student.address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NIC</p>
                      <p className="text-sm text-slate-900 font-medium">{student.nic || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Guardian</p>
                      <p className="text-sm text-slate-900 font-medium">{student.guardian_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">School</p>
                      <p className="text-sm text-slate-900 font-medium">{student.school || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Joined</p>
                      <p className="text-sm text-slate-900 font-medium">{fmtDate(student.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 15. DESTRUCTIVE ACTION */}
              <div className="pt-8">
                <h2 className="text-xs font-bold text-red-500/80 uppercase tracking-widest mb-4">Danger Zone</h2>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-red-700">Delete student</h3>
                    <p className="text-xs text-red-600/80 mt-1">Permanently delete this student's account and associated data.</p>
                    {deleteError && <p className="text-xs font-medium text-red-700 mt-2">{deleteError}</p>}
                  </div>
                  <button onClick={() => setConfirmDelete(true)} className="shrink-0 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                    Delete student
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* 6. ENROLLMENT */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Enrollment</h2>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="mb-4">
                    <p className="text-lg font-bold text-slate-900">{student.program || 'N/A'} {student.exam_year}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{studentBatches.length > 0 ? studentBatches.map(b => b.name).join(', ') : 'No active batches'}</p>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Manage Batches</p>
                    {batches.length === 0 ? (
                      <p className="text-xs text-slate-400">No batches available.</p>
                    ) : (
                      batches.map(b => (
                        <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <span className="text-sm text-slate-700 font-medium">{b.name}</span>
                          {busy.has(`b:${b.id}`) ? <Loader2Icon className="w-4 h-4 text-slate-400 animate-spin" /> : <Toggle on={batchIds.has(b.id)} onClick={() => toggleBatch(b.id)} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 7. VERIFICATION */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Verification</h2>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${vChip.cls.replace('ring-1', '')}`}>
                      <vChip.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{vChip.label}</p>
                      <p className="text-xs text-slate-500">ID Verification Status</p>
                    </div>
                  </div>
                  
                  {student.id_front_path && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Documents</p>
                      <div className="grid grid-cols-2 gap-2">
                        {idUrls.front ? <a href={idUrls.front} target="_blank" rel="noreferrer"><img src={idUrls.front} className="w-full h-20 object-cover rounded-lg border border-slate-200" alt="Front" /></a> : <div className="h-20 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center"><Loader2Icon className="w-4 h-4 animate-spin text-slate-400"/></div>}
                        {idUrls.back ? <a href={idUrls.back} target="_blank" rel="noreferrer"><img src={idUrls.back} className="w-full h-20 object-cover rounded-lg border border-slate-200" alt="Back" /></a> : student.id_back_path ? <div className="h-20 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center"><Loader2Icon className="w-4 h-4 animate-spin text-slate-400"/></div> : null}
                      </div>
                      
                      {vStatus === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowReject(true)} className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Reject</button>
                          <button onClick={() => decideVerification('approved')} disabled={vBusy} className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">{vBusy ? '...' : 'Approve'}</button>
                        </div>
                      )}
                      {showReject && (
                        <div className="pt-2 space-y-2">
                          <textarea className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300" placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                          <div className="flex gap-2">
                            <button onClick={() => setShowReject(false)} className="flex-1 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">Cancel</button>
                            <button onClick={() => decideVerification('rejected')} disabled={vBusy} className="flex-1 px-2 py-1 text-[10px] font-bold text-white bg-red-600 rounded-lg uppercase">Confirm Reject</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Access Workspace</h2>
                <p className="text-sm text-slate-500 mt-1">Manage the learning content available to this student.</p>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search packages..." value={accessSearch} onChange={e => setAccessSearch(e.target.value)} className="w-full sm:w-64 h-9 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20 focus:border-[#c20f24]" />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Video Packages</h3>
              {filteredPacks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-500">No video packages found.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
                  {filteredPacks.map(p => {
                    const state = packState(p);
                    const saving = busy.has(`p:${p.id}`);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                            {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <FilmIcon className="w-6 h-6 text-slate-300 m-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.title}</p>
                            <p className="text-xs text-slate-500 truncate">{p.type} · {p.is_free ? 'Free' : formatLKR(p.price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-4">
                          {state === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg"><LockIcon className="w-3.5 h-3.5" /> Paid access</span>
                          ) : state === 'granted' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"><CheckIcon className="w-3.5 h-3.5" /> Granted</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 px-2.5 py-1">○ Not granted</span>
                          )}
                          
                          {saving ? <Loader2Icon className="w-5 h-5 text-slate-300 animate-spin" /> : state !== 'paid' && (
                            <Toggle on={state === 'granted'} onClick={() => state === 'granted' ? revoke(`p:${p.id}`, packEnr[p.id].id) : grant(`p:${p.id}`, { pack_id: p.id })} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Monthly Recordings</h3>
              {monthsByYear.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-500">No monthly recordings found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {monthsByYear.map(([year, list]) => (
                    <div key={year}>
                      <h4 className="text-[11px] font-bold text-slate-400 mb-3 ml-1">{year}</h4>
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
                        {list.map(m => {
                          const state = monthState(m);
                          const saving = busy.has(`m:${m.id}`);
                          return (
                            <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-violet-50 shrink-0 overflow-hidden flex items-center justify-center">
                                  {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <CalendarIcon className="w-6 h-6 text-violet-300" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{m.month} {m.year}</p>
                                  <p className="text-xs text-slate-500 truncate">{m.session_count || 0} sessions</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 pl-4">
                                {state === 'paid' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg"><LockIcon className="w-3.5 h-3.5" /> Paid access</span>
                                ) : state === 'granted' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg"><CheckIcon className="w-3.5 h-3.5" /> Granted</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 px-2.5 py-1">○ Not granted</span>
                                )}
                                
                                {saving ? <Loader2Icon className="w-5 h-5 text-slate-300 animate-spin" /> : state !== 'paid' && (
                                  <Toggle on={state === 'granted'} onClick={() => state === 'granted' ? revoke(`m:${m.id}`, monthEnr[m.id].id) : grant(`m:${m.id}`, { theory_month_id: m.id })} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-lg font-bold text-slate-900">AQuiz Performance</h2>
              <p className="text-sm text-slate-500 mt-1">Review student assessment history and scores.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Attempts</p>
                <p className="text-3xl font-black text-slate-900">{quizAttempts.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Average Score</p>
                <p className="text-3xl font-black text-slate-900">{quizAttempts.length ? Math.round(quizAttempts.reduce((a, b) => a + b.percentage, 0) / quizAttempts.length) : 0}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pass Rate</p>
                <p className="text-3xl font-black text-slate-900">{quizAttempts.length ? Math.round((quizAttempts.filter(q => q.passed).length / quizAttempts.length) * 100) : 0}%</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quiz History</h3>
              {quizAttempts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-500">No quizzes completed yet.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
                  {quizAttempts.map(qa => (
                    <div key={qa.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" onClick={() => navigate(`/admin/quizzes/${qa.quiz_id}/results`)}>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{qa.quiz?.title || 'Unknown Quiz'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fmtDate(qa.submitted_at)}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{qa.score} / {qa.total_marks}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{qa.percentage}%</p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-16 py-1 rounded-lg text-xs font-bold ${qa.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {qa.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payments</h2>
              <p className="text-sm text-slate-500 mt-1">Transaction history and approvals.</p>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-500">No payment records found.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-slate-400">Date</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-slate-400">Item</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-slate-400">Amount</th>
                      <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(p.created_at)}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{p.kind === 'monthly_fee' ? `Monthly · ${p.period_month} ${p.period_year}` : p.kind}</td>
                        <td className="px-4 py-3 text-slate-900 font-mono font-medium">{formatLKR(Number(p.amount))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            p.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                            p.status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status === 'approved' && <CheckIcon className="w-3 h-3" />}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => navigate(`/admin/payments`)} className="text-xs font-bold text-[#c20f24] hover:underline">View payment</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete student?"
        message="This permanently deletes the account and all their data (payments, access, progress, uploaded ID). This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete student'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
