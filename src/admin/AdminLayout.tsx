import { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboardIcon,
  ReceiptTextIcon,
  LayersIcon,
  PackageIcon,
  VideoIcon,
  UsersIcon,
  TrendingUpIcon,
  MegaphoneIcon,
  MessageSquareQuoteIcon,
  BookMarkedIcon,
  GraduationCapIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  ExternalLinkIcon,
  BookOpenIcon,
  BellRingIcon,
  ArrowRightIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const nav = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboardIcon, end: true },
  { name: 'Payments', path: '/admin/payments', icon: ReceiptTextIcon, badge: 'payments' },
  { name: 'Batches', path: '/admin/batches', icon: LayersIcon },
  { name: 'Packs', path: '/admin/packs', icon: PackageIcon },
  { name: 'Recordings', path: '/admin/theory', icon: VideoIcon },
  { name: 'Students', path: '/admin/students', icon: UsersIcon, badge: 'ids' },
  { name: 'Paper Marks', path: '/admin/marks', icon: TrendingUpIcon },
  { name: 'Promotions', path: '/admin/promotions', icon: MegaphoneIcon },
  { name: 'Reviews', path: '/admin/reviews', icon: MessageSquareQuoteIcon },
  { name: 'Books', path: '/admin/books', icon: BookMarkedIcon },
  { name: 'Featured', path: '/admin/featured', icon: GraduationCapIcon },
  { name: 'Settings', path: '/admin/settings', icon: SettingsIcon }
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'payment' | 'id'>('payment');

  const fetchPending = useCallback(async () => {
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPending(count ?? 0);
  }, []);

  const fetchPendingIds = useCallback(async () => {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'pending');
    setPendingIds(count ?? 0);
  }, []);

  // initial + on navigation
  useEffect(() => {
    fetchPending();
    fetchPendingIds();
  }, [fetchPending, fetchPendingIds, location.pathname]);

  // realtime: alert the moment a payment is submitted / changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-payments-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          fetchPending();
          if (payload.eventType === 'INSERT') {
            setToastKind('payment');
            setToast('💰 New payment submitted — needs your verification');
            setTimeout(() => setToast(null), 8000);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPending]);

  // realtime: alert the moment a student uploads an ID for verification
  useEffect(() => {
    const channel = supabase
      .channel('admin-id-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async (payload) => {
          fetchPendingIds();
          const row = payload.new as { verification_status?: string; id?: string } | undefined;
          const becamePending =
            payload.eventType === 'INSERT'
              ? row?.verification_status === 'pending'
              : payload.eventType === 'UPDATE' && row?.verification_status === 'pending';
          if (becamePending && row?.id) {
            // Realtime payload may not include full_name, so fetch it for the toast.
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', row.id)
              .maybeSingle();
            const name = (data as { full_name?: string } | null)?.full_name?.trim() || 'A student';
            setToastKind('id');
            setToast(`🆔 ${name} uploaded an ID — verification needed`);
            setTimeout(() => setToast(null), 9000);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingIds]);

  const showBanner = (pending ?? 0) > 0 && location.pathname !== '/admin/payments';
  const showIdBanner = (pendingIds ?? 0) > 0 && location.pathname !== '/admin/students';

  // close mobile drawer on navigation
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const NavList = () => (
    <nav className="flex-1 px-3 space-y-1">
      {nav.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge === 'payments' && pending ? (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {pending}
                </span>
              ) : null}
              {item.badge === 'ids' && pendingIds ? (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {pendingIds}
                </span>
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* brand */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
          <BookOpenIcon className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-slate-900 text-[15px]">Pasindu Dissanayake ICT</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin</p>
        </div>
      </div>

      <NavList />

      {/* footer */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ExternalLinkIcon className="w-[18px] h-[18px]" />
          Student view
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOutIcon className="w-[18px] h-[18px]" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200">
        <SidebarInner />
      </aside>

      {/* mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">Admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Menu"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </header>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <SidebarInner />
          </div>
        </div>
      )}

      {/* content */}
      <main className="lg:pl-64">
        {/* persistent pending-ID banner (every page) — shown above payments for prominence */}
        {showIdBanner && (
          <Link
            to="/admin/students"
            className="flex items-center gap-3 bg-rose-600 text-white px-4 sm:px-8 py-3 hover:bg-rose-700 transition-colors"
          >
            <BellRingIcon className="w-5 h-5 shrink-0 animate-pulse" />
            <p className="text-sm font-semibold flex-1">
              {pendingIds} student{pendingIds === 1 ? '' : 's'} uploaded an ID awaiting verification
            </p>
            <span className="text-sm font-bold flex items-center gap-1 shrink-0">
              Verify now <ArrowRightIcon className="w-4 h-4" />
            </span>
          </Link>
        )}

        {/* persistent pending-payments banner (every page) */}
        {showBanner && (
          <Link
            to="/admin/payments"
            className="flex items-center gap-3 bg-amber-500 text-white px-4 sm:px-8 py-3 hover:bg-amber-600 transition-colors"
          >
            <BellRingIcon className="w-5 h-5 shrink-0 animate-pulse" />
            <p className="text-sm font-semibold flex-1">
              {pending} payment{pending === 1 ? '' : 's'} waiting for verification
            </p>
            <span className="text-sm font-bold flex items-center gap-1 shrink-0">
              Verify now <ArrowRightIcon className="w-4 h-4" />
            </span>
          </Link>
        )}

        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ adminName: user?.name }} />
        </div>
      </main>

      {/* realtime toast */}
      {toast && (
        <button
          onClick={() => { const dest = toastKind === 'id' ? '/admin/students' : '/admin/payments'; setToast(null); navigate(dest); }}
          className="fixed bottom-5 right-5 z-[70] flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl pl-4 pr-5 py-3 max-w-sm text-left hover:bg-slate-800 transition-colors"
        >
          <BellRingIcon className={`w-5 h-5 shrink-0 ${toastKind === 'id' ? 'text-rose-400' : 'text-amber-400'}`} />
          <span className="text-sm font-medium">{toast}</span>
        </button>
      )}
    </div>
  );
}
