import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ReceiptTextIcon,
  UsersIcon,
  LayersIcon,
  PackageIcon,
  ArrowRightIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Counts = {
  pending: number;
  students: number;
  batches: number;
  packs: number;
};

async function countOf(table: string, build?: (q: any) => any) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export function AdminOverviewPage() {
  const { adminName } = useOutletContext<{ adminName?: string }>();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    Promise.all([
      countOf('payments', (q) => q.eq('status', 'pending')),
      countOf('profiles', (q) => q.eq('role', 'student')),
      countOf('batches'),
      countOf('packs')
    ]).then(([pending, students, batches, packs]) =>
      setCounts({ pending, students, batches, packs })
    );
  }, []);

  const stats = [
    { label: 'Pending payments', value: counts?.pending, icon: ReceiptTextIcon, to: '/admin/payments', urgent: true },
    { label: 'Students', value: counts?.students, icon: UsersIcon, to: '/admin/students' },
    { label: 'Batches', value: counts?.batches, icon: LayersIcon, to: '/admin/batches' },
    { label: 'Packs', value: counts?.packs, icon: PackageIcon, to: '/admin/packs' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome{adminName ? `, ${adminName.split(' ')[0]}` : ''} 👋
      </h1>
      <p className="text-sm text-slate-500 mt-1 mb-8">Here's what needs your attention today.</p>

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className={`group rounded-2xl bg-white border p-5 transition-all hover:shadow-md ${
              s.urgent && (s.value ?? 0) > 0 ? 'border-amber-200' : 'border-slate-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                s.urgent && (s.value ?? 0) > 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-slate-900 leading-none">
              {s.value ?? '—'}
            </p>
            <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1">
              {s.label}
              <ArrowRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </Link>
        ))}
      </div>

      {/* quick start hint */}
      <div className="mt-8 rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-1">Getting started</h2>
        <p className="text-sm text-slate-500 mb-4">A good first run-through:</p>
        <ol className="space-y-2.5 text-sm text-slate-700">
          {[
            ['Create a batch', 'e.g. “A/L 2026” — under Batches.', '/admin/batches'],
            ['Add a pack', 'Upload a video pack and target it to that batch.', '/admin/packs'],
            ['Verify payments', 'Approve student deposit slips to unlock content.', '/admin/payments']
          ].map(([title, desc, to], i) => (
            <li key={title as string} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span>
                <Link to={to as string} className="font-semibold text-slate-900 hover:text-blue-600">
                  {title}
                </Link>
                <span className="text-slate-500"> — {desc}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
