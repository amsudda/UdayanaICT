import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  UserMinusIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  Loader2Icon,
  ChevronRightIcon,
  ArrowUpDownIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  PageHeader, Button, SearchInput, FilterTabs, StatusPill,
  TableFrame, Th, Td, Initials, EmptyState, Panel
} from '../components/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = 'all' | 'pending' | 'approved' | 'unverified' | 'nobatch';
type Sort = 'recent' | 'name' | 'code';

const PAGE = 40;

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const VERIFICATION: Record<string, { tone: 'green' | 'amber' | 'red' | 'slate'; label: string }> = {
  approved: { tone: 'green', label: 'Verified' },
  pending: { tone: 'amber', label: 'ID pending' },
  rejected: { tone: 'red', label: 'ID rejected' }
};

export function AdminStudentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [batchId, setBatchId] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [shown, setShown] = useState(PAGE);

  // ID review, inline — the queue is the reason this page gets opened
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ss }, { data: bs }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, batch_members(batch:batches(id,name,exam_year,medium))')
        .eq('role', 'student')
        .order('created_at', { ascending: false }),
      supabase.from('batches').select('*').order('exam_year', { ascending: false }).order('name')
    ]);
    setStudents(ss ?? []);
    setBatches(bs ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const batchesOf = (s: any) => (s.batch_members ?? []).map((m: any) => m.batch).filter(Boolean);

  /* ── counts for the strip and the tabs ── */
  const counts = useMemo(() => {
    let pending = 0, approved = 0, nobatch = 0, rejected = 0;
    students.forEach((s) => {
      if (s.verification_status === 'pending') pending++;
      else if (s.verification_status === 'approved') approved++;
      else if (s.verification_status === 'rejected') rejected++;
      if (batchesOf(s).length === 0) nobatch++;
    });
    return { pending, approved, rejected, nobatch, total: students.length };
  }, [students]);

  /* ── the list the table shows ── */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = students.filter((s) => {
      if (tab === 'pending' && s.verification_status !== 'pending') return false;
      if (tab === 'approved' && s.verification_status !== 'approved') return false;
      if (tab === 'unverified' && (s.verification_status === 'approved' || s.verification_status === 'pending')) return false;
      if (tab === 'nobatch' && batchesOf(s).length > 0) return false;
      if (batchId && !batchesOf(s).some((b: any) => b.id === batchId)) return false;
      if (!q) return true;
      return [s.full_name, s.email, s.student_code, s.phone, s.school]
        .some((v: string) => (v ?? '').toLowerCase().includes(q));
    });

    const sorted = [...rows];
    if (sort === 'name') sorted.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
    else if (sort === 'code') sorted.sort((a, b) => (a.student_code ?? '').localeCompare(b.student_code ?? ''));
    return sorted;
  }, [students, search, tab, batchId, sort]);

  useEffect(() => { setShown(PAGE); }, [search, tab, batchId, sort]);

  /* ── ID review ── */
  const viewId = async (s: any) => {
    const paths = [s.id_front_path, s.id_back_path].filter(Boolean) as string[];
    if (!paths.length) return;
    const results = await Promise.all(paths.map((p) => supabase.storage.from('id-cards').createSignedUrl(p, 3600)));
    results.forEach((r) => { if (r.data?.signedUrl) window.open(r.data.signedUrl, '_blank'); });
  };
  const approveId = async (s: any) => {
    setBusyId(s.id);
    await supabase.from('profiles').update({
      verification_status: 'approved',
      verification_reviewed_by: user?.id ?? null,
      verification_reviewed_at: new Date().toISOString(),
      verification_reject_reason: null
    }).eq('id', s.id);
    setBusyId(null);
    load();
  };
  const doRejectId = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    await supabase.from('profiles').update({
      verification_status: 'rejected',
      verification_reviewed_by: user?.id ?? null,
      verification_reviewed_at: new Date().toISOString(),
      verification_reject_reason: 'Please re-upload a clearer ID.'
    }).eq('id', rejectTarget.id);
    setBusyId(null);
    setRejectTarget(null);
    load();
  };

  const exportVisible = () => {
    const header = ['Student ID', 'Name', 'Email', 'Phone', 'Batches', 'Verification', 'School', 'Exam year', 'Joined'];
    const rows = visible.map((s) => [
      s.student_code, s.full_name, s.email, s.phone,
      batchesOf(s).map((b: any) => b.name).join(' / '),
      s.verification_status ?? 'not submitted',
      s.school, s.exam_year,
      s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : ''
    ]);
    downloadCsv(`students_${tab}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  const stats = [
    { label: 'Students', value: counts.total, sub: 'registered', icon: UsersIcon, tint: 'bg-blue-50 text-blue-600', tab: 'all' as Tab },
    { label: 'Verified', value: counts.approved, sub: 'ID approved', icon: ShieldCheckIcon, tint: 'bg-emerald-50 text-emerald-600', tab: 'approved' as Tab },
    {
      label: 'ID pending',
      value: counts.pending,
      sub: counts.pending ? 'waiting on you' : 'all reviewed',
      icon: ShieldAlertIcon,
      tint: counts.pending ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500',
      tab: 'pending' as Tab
    },
    {
      label: 'In no batch',
      value: counts.nobatch,
      sub: counts.nobatch ? 'see nothing yet' : 'everyone placed',
      icon: UserMinusIcon,
      tint: counts.nobatch ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500',
      tab: 'nobatch' as Tab
    }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academic"
        title="Students"
        description={`${counts.total} registered. Review IDs, check batches, open a student for the full record.`}
        actions={<Button variant="secondary" icon={DownloadIcon} onClick={exportVisible}>Export</Button>}
      />

      {/* ── Counts, each one a filter ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setTab(s.tab)}
            className={`rise-in rounded-2xl border bg-white p-4 flex items-center gap-3 text-left transition-colors ${
              tab === s.tab ? 'border-[#c20f24]/40 ring-2 ring-[#c20f24]/10' : 'border-slate-200 hover:border-slate-300'
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.tint}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[22px] font-bold text-slate-900 leading-none tabular-nums">{s.value}</p>
              <p className="text-[12px] text-slate-500 mt-1 truncate">
                <span className="font-semibold text-slate-600">{s.label}</span> · {s.sub}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, student ID, email, phone or school"
            className="lg:max-w-md w-full"
          />
          <FilterTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: `All (${counts.total})` },
              { value: 'pending', label: `ID pending (${counts.pending})` },
              { value: 'approved', label: `Verified (${counts.approved})` },
              { value: 'unverified', label: 'Not submitted' },
              { value: 'nobatch', label: `No batch (${counts.nobatch})` }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20"
          >
            <option value="">Every batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.exam_year ? ` (${b.exam_year})` : ''}</option>
            ))}
          </select>

          <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-500">
            <ArrowUpDownIcon className="w-3.5 h-3.5" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c20f24]/20"
            >
              <option value="recent">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="code">Student ID</option>
            </select>
          </span>

          {(search || tab !== 'all' || batchId) && (
            <button
              onClick={() => { setSearch(''); setTab('all'); setBatchId(''); }}
              className="h-10 px-3 rounded-xl text-[13px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-[13px] text-slate-400">
            {visible.length} of {counts.total} shown
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={UsersIcon}
            title={counts.total === 0 ? 'No students yet' : 'Nothing matches those filters'}
            description={
              counts.total === 0
                ? 'Students appear here as soon as they register on the site.'
                : 'Try a different search, or clear the filters above.'
            }
          />
        </Panel>
      ) : (
        <>
          <TableFrame
            head={
              <>
                <Th>Student</Th>
                <Th className="hidden lg:table-cell">Batch</Th>
                <Th className="hidden xl:table-cell">Phone</Th>
                <Th>Verification</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {visible.slice(0, shown).map((s, i) => {
              const v = VERIFICATION[s.verification_status] ?? { tone: 'slate' as const, label: 'Not submitted' };
              const bs = batchesOf(s);
              const isPending = s.verification_status === 'pending';
              return (
                <tr
                  key={s.id}
                  className="rise-in hover:bg-slate-50/60 transition-colors cursor-pointer"
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  onClick={() => navigate(`/admin/students/${s.id}`)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Initials name={s.full_name} src={s.avatar_url} size={36} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{s.full_name || '(no name)'}</p>
                        <p className="text-[12px] text-slate-400 truncate">
                          {[s.student_code, s.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </Td>

                  <Td className="hidden lg:table-cell">
                    {bs.length === 0 ? (
                      <span className="text-[12px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg">No batch</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {bs.slice(0, 2).map((b: any) => (
                          <span key={b.id} className="text-[12px] text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[160px]">
                            {b.name}
                          </span>
                        ))}
                        {bs.length > 2 && <span className="text-[12px] text-slate-400">+{bs.length - 2}</span>}
                      </div>
                    )}
                  </Td>

                  <Td className="hidden xl:table-cell text-slate-500 whitespace-nowrap">{s.phone || '—'}</Td>

                  <Td><StatusPill tone={v.tone}>{v.label}</StatusPill></Td>

                  <Td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* reviewing an ID should not need a trip into the record */}
                      {isPending && (
                        <>
                          <button
                            onClick={() => viewId(s)}
                            title="View the uploaded ID"
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors active:scale-95 duration-150"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => approveId(s)}
                            disabled={busyId === s.id}
                            title="Approve this ID"
                            className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                          >
                            {busyId === s.id ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setRejectTarget(s)}
                            disabled={busyId === s.id}
                            title="Reject this ID"
                            className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40 active:scale-95 duration-150"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                          <span className="w-px h-5 bg-slate-200 mx-1" />
                        </>
                      )}
                      <button
                        onClick={() => navigate(`/admin/students/${s.id}`)}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Open <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </TableFrame>

          {visible.length > shown && (
            <div className="flex justify-center mt-4">
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, visible.length - shown)} more
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this ID?"
        message={`${rejectTarget?.full_name ?? 'This student'} will be asked to upload a clearer photo before they can reach their lessons.`}
        confirmLabel="Reject"
        onConfirm={doRejectId}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
