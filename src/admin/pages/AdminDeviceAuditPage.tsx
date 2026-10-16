import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  LaptopIcon,
  Loader2Icon,
  MonitorIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TabletIcon,
  UsersIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FilterTabs, PageHeader, SearchInput, StatCard, StatusPill, TableFrame, Td, Th } from '../components/ui';
import { CohortRolloutPanel } from '../components/CohortRolloutPanel';
import { DeviceRolloutHealthPanel } from '../components/DeviceRolloutHealthPanel';
import { DeviceLifecyclePanel } from '../components/DeviceLifecyclePanel';

type DeviceRow = {
  id: string;
  student_id: string;
  display_name: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser_name: string | null;
  os_name: string | null;
  last_seen: string;
  would_exceed_limit: boolean;
  lifecycle_status: 'active' | 'stale' | 'retired' | 'revoked';
  student: {
    id: string;
    full_name: string | null;
    student_code: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type StudentAudit = {
  id: string;
  name: string;
  studentCode: string;
  email: string;
  phone: string;
  devices: DeviceRow[];
  lastSeen: string;
  overLimit: boolean;
  pilotEnabled: boolean;
  locked: boolean;
  request: AccessRequestRow | null;
};

type SecurityRow = {
  student_id: string;
  pilot_enabled: boolean;
  status: 'active' | 'locked';
  updated_at: string;
  student: {
    id: string;
    full_name: string | null;
    student_code: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type AccessRequestRow = {
  id: string;
  student_id: string;
  reason: string;
  status: 'pending' | 'contacted';
  created_at: string;
};

type Filter = 'attention' | 'requests' | 'pilot' | 'all';

const icons = {
  desktop: MonitorIcon,
  mobile: SmartphoneIcon,
  tablet: TabletIcon,
  unknown: LaptopIcon
};

const relativeTime = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function AdminDeviceAuditPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [securityRows, setSecurityRows] = useState<SecurityRow[]>([]);
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [maxDevices, setMaxDevices] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('attention');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [devicesResult, settingsResult, securityResult, requestsResult] = await Promise.all([
      supabase
        .from('student_devices')
        .select('id,student_id,display_name,device_type,browser_name,os_name,last_seen,would_exceed_limit,lifecycle_status,student:profiles!student_id(id,full_name,student_code,email,phone)')
        .order('last_seen', { ascending: false }),
      supabase.from('device_security_settings').select('max_devices,mode').eq('id', 1).maybeSingle(),
      supabase.from('student_device_security').select('student_id,pilot_enabled,status,updated_at,student:profiles!student_id(id,full_name,student_code,email,phone)'),
      supabase
        .from('device_access_requests')
        .select('id,student_id,reason,status,created_at')
        .in('status', ['pending', 'contacted'])
        .order('created_at', { ascending: true })
    ]);

    if (devicesResult.error) {
      setError('Device security data is unavailable. Apply the device-security migrations in order, then refresh this page.');
    } else {
      setRows((devicesResult.data ?? []) as unknown as DeviceRow[]);
      setSecurityRows((securityResult.data ?? []) as SecurityRow[]);
      setRequests((requestsResult.data ?? []) as AccessRequestRow[]);
      if (settingsResult.data?.max_devices) setMaxDevices(settingsResult.data.max_devices);
      if (securityResult.error || requestsResult.error) {
        setError('Audit data is available, but the admin pilot migration has not been applied yet.');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-device-audit-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_devices' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_device_security' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_access_requests' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const students = useMemo(() => {
    const grouped = new Map<string, StudentAudit>();
    const securityByStudent = new Map(securityRows.map((row) => [row.student_id, row]));
    const requestByStudent = new Map(requests.map((row) => [row.student_id, row]));
    rows.forEach((device) => {
      const existing = grouped.get(device.student_id);
      if (existing) {
        existing.devices.push(device);
        if (new Date(device.last_seen) > new Date(existing.lastSeen)) existing.lastSeen = device.last_seen;
        existing.overLimit = existing.devices.filter((item) => item.lifecycle_status === 'active').length > maxDevices || existing.devices.some((item) => item.would_exceed_limit);
        return;
      }
      grouped.set(device.student_id, {
        id: device.student_id,
        name: device.student?.full_name || 'Unnamed student',
        studentCode: device.student?.student_code || 'No student ID',
        email: device.student?.email || '',
        phone: device.student?.phone || '',
        devices: [device],
        lastSeen: device.last_seen,
        overLimit: device.would_exceed_limit || 1 > maxDevices,
        pilotEnabled: securityByStudent.get(device.student_id)?.pilot_enabled === true,
        locked: securityByStudent.get(device.student_id)?.status === 'locked',
        request: requestByStudent.get(device.student_id) ?? null
      });
    });
    securityRows.forEach((security) => {
      if (grouped.has(security.student_id)) return;
      grouped.set(security.student_id, {
        id: security.student_id,
        name: security.student?.full_name || 'Unnamed student',
        studentCode: security.student?.student_code || 'No student ID',
        email: security.student?.email || '',
        phone: security.student?.phone || '',
        devices: [],
        lastSeen: security.updated_at,
        overLimit: false,
        pilotEnabled: security.pilot_enabled,
        locked: security.status === 'locked',
        request: requestByStudent.get(security.student_id) ?? null
      });
    });
    return Array.from(grouped.values()).sort((a, b) => {
      const priority = (student: StudentAudit) => student.request ? 3 : student.locked ? 2 : student.overLimit ? 1 : 0;
      if (priority(a) !== priority(b)) return priority(b) - priority(a);
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
  }, [rows, maxDevices, requests, securityRows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (filter === 'attention' && !student.overLimit && !student.locked && !student.request) return false;
      if (filter === 'requests' && !student.request) return false;
      if (filter === 'pilot' && !student.pilotEnabled) return false;
      if (!needle) return true;
      return [student.name, student.studentCode, student.email, student.phone]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [students, filter, query]);

  const flaggedCount = students.filter((student) => student.overLimit).length;
  const pilotCount = students.filter((student) => student.pilotEnabled).length;
  const lockedCount = students.filter((student) => student.locked).length;
  const requestCount = students.filter((student) => student.request).length;

  return (
    <div>
      <PageHeader
        eyebrow="Account security"
        title="Device security"
        description="Expand the two-device rule gradually with monitored, reversible student cohorts."
      />

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 flex items-start gap-3">
        <ShieldCheckIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-slate-900">Limited rollout · Global audit remains active</p>
          <p className="text-[13px] text-slate-600 mt-0.5">Enrol capped groups from one batch, monitor lock and request rates, and pause or roll back without affecting observation data.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Observed students" value={students.length} sub={`${rows.length} browser installations`} />
        <StatCard label="Pilot students" value={pilotCount} sub={`Selected for the ${maxDevices}-device rule`} />
        <StatCard label="Locked accounts" value={lockedCount} sub="Waiting for admin resolution" />
        <StatCard label="Access requests" value={requestCount} sub={`${flaggedCount} audit account${flaggedCount === 1 ? '' : 's'} over limit`} />
      </div>

      {!loading && !error && <DeviceRolloutHealthPanel maxDevices={maxDevices} />}
      {!loading && !error && <DeviceLifecyclePanel onChanged={() => void load()} />}
      {!loading && !error && <CohortRolloutPanel maxDevices={maxDevices} onChanged={() => void load()} />}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="overflow-x-auto pb-1">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'attention', label: `Needs attention (${students.filter((student) => student.overLimit || student.locked || student.request).length})` },
              { value: 'requests', label: `Requests (${requestCount})` },
              { value: 'pilot', label: `Pilot (${pilotCount})` },
              { value: 'all', label: `All (${students.length})` }
            ]}
          />
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search student, ID, email or phone" className="w-full lg:w-80" />
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2Icon className="w-7 h-7 text-slate-300 animate-spin" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          {filter === 'attention' ? <ShieldCheckIcon className="w-10 h-10 text-emerald-300 mx-auto mb-3" /> : <UsersIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />}
          <p className="font-semibold text-slate-900">{filter === 'attention' ? 'No accounts need attention' : 'No matching audit records'}</p>
          <p className="text-sm text-slate-500 mt-1">{filter === 'attention' ? 'There are no locks, open requests, or over-limit audit accounts.' : 'Try another search or filter.'}</p>
        </div>
      ) : (
        <TableFrame
          head={
            <>
              <Th>Student</Th>
              <Th>Observed devices</Th>
              <Th>Last activity</Th>
              <Th>Status</Th>
              <Th className="w-12" />
            </>
          }
        >
          {filtered.map((student) => (
            <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
              <Td>
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{student.studentCode} · {student.email || student.phone || 'No contact details'}</p>
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-1.5">
                  {student.devices.filter((device) => device.lifecycle_status === 'active').slice(0, 4).map((device) => {
                    const Icon = icons[device.device_type] ?? LaptopIcon;
                    return (
                      <span key={device.id} title={device.display_name || 'Unknown device'} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                    );
                  })}
                  <span className="ml-1 font-bold tabular-nums text-slate-900">{student.devices.filter((device) => device.lifecycle_status === 'active').length}</span>
                  {student.devices.some((device) => device.lifecycle_status !== 'active') && <span className="text-[10px] text-slate-400">+{student.devices.filter((device) => device.lifecycle_status !== 'active').length} history</span>}
                </div>
              </Td>
              <Td><span className="text-sm text-slate-600">{relativeTime(student.lastSeen)}</span></Td>
              <Td>
                {student.request ? (
                  <StatusPill tone="amber">Access requested</StatusPill>
                ) : student.locked ? (
                  <StatusPill tone="red">Locked</StatusPill>
                ) : student.pilotEnabled ? (
                  <StatusPill tone="violet">Pilot active</StatusPill>
                ) : student.overLimit ? (
                  <StatusPill tone="red"><AlertTriangleIcon className="w-3 h-3" /> Would exceed limit</StatusPill>
                ) : (
                  <StatusPill tone="green">Within limit</StatusPill>
                )}
              </Td>
              <Td className="text-right">
                <Link
                  to={`/admin/students/${student.id}?tab=devices`}
                  aria-label={`View ${student.name}'s devices`}
                  className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-[#c20f24] hover:bg-red-50"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </Td>
            </tr>
          ))}
        </TableFrame>
      )}
    </div>
  );
}
