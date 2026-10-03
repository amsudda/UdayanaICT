import { useState, useEffect, useCallback } from 'react';
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
  BellRingIcon,
  ArrowRightIcon,
  FileTextIcon,
  ClipboardListIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * The admin shell.
 *
 * The sidebar is grouped rather than one long list of fifteen items: a
 * teacher looking for Paper Marks scans "ACADEMIC" instead of reading
 * every label. Groups are also what make the panel legible when it
 * collapses to icons.
 */
const navGroups = [
  {
    label: 'Main',
    items: [{ name: 'Overview', path: '/admin', icon: LayoutDashboardIcon, end: true }]
  },
  {
    label: 'Academic',
    items: [
      { name: 'Batches', path: '/admin/batches', icon: LayersIcon },
      { name: 'Students', path: '/admin/students', icon: UsersIcon, badge: 'ids' },
      { name: 'Papers', path: '/admin/papers', icon: FileTextIcon },
      { name: 'Paper Marks', path: '/admin/marks', icon: TrendingUpIcon },
      { name: 'AQuiz', path: '/admin/quizzes', icon: ClipboardListIcon }
    ]
  },
  {
    label: 'Content',
    items: [
      { name: 'Packs', path: '/admin/packs', icon: PackageIcon },
      { name: 'Monthly Recordings', path: '/admin/theory', icon: VideoIcon },
      { name: 'Books', path: '/admin/books', icon: BookMarkedIcon }
    ]
  },
  {
    label: 'Engagement',
    items: [
      { name: 'Notices', path: '/admin/notices', icon: BellRingIcon },
      { name: 'Promotions', path: '/admin/promotions', icon: MegaphoneIcon },
      { name: 'Reviews', path: '/admin/reviews', icon: MessageSquareQuoteIcon },
      { name: 'Featured', path: '/admin/featured', icon: GraduationCapIcon }
    ]
  },
  {
    label: 'Finance',
    items: [{ name: 'Payments', path: '/admin/payments', icon: ReceiptTextIcon, badge: 'payments' }]
  },
  {
    label: 'System',
    items: [{ name: 'Settings', path: '/admin/settings', icon: SettingsIcon }]
  }
] as const;

const COLLAPSE_KEY = 'admin:sidebar:collapsed';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [pending, setPending] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'payment' | 'id'>('payment');

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

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
          if (becamePending) {
            setToastKind('id');
            setToast('🪪 A student uploaded an ID — needs verification');
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

  const badgeFor = (badge?: string) =>
    badge === 'payments' ? pending : badge === 'ids' ? pendingIds : null;

  /** `mini` is the collapsed desktop rail; the mobile drawer is never mini. */
  const SidebarInner = ({ mini }: { mini: boolean }) => (
    <div className="flex flex-col h-full text-slate-300">
      {/* Brand */}
      <div className={`flex items-center gap-3 border-b border-white/[0.06] ${mini ? 'px-3 py-5 justify-center' : 'px-5 py-5'}`}>
        {/* white tile: the logo is drawn in the brand red, so it needs a
            light ground to read against the dark rail */}
        <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-black/30">
          <img src="/images/pd-logo.png" alt="" className="w-7 h-7 object-contain" />
        </span>
        {!mini && (
          <div className="leading-tight min-w-0">
            <p className="font-bold text-white text-[15px] truncate">Pasindu Dissanayake</p>
            <p className="text-[11px] text-slate-400 truncate">ICT · Admin</p>
          </div>
        )}
      </div>

      {/* Groups */}
      <nav data-lenis-prevent className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {mini ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" title={group.label} />
            ) : (
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const count = badgeFor((item as any).badge);
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={(item as any).end}
                    title={mini ? item.name : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center rounded-xl text-sm font-medium transition-colors ${
                        mini ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-[#c20f24]/15 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-[#c20f24]" />
                        )}
                        <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-[#ff4d5f]' : ''}`} />
                        {!mini && <span className="flex-1 truncate">{item.name}</span>}
                        {!!count && (
                          mini ? (
                            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#ff4d5f]" />
                          ) : (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#c20f24] text-white">
                              {count}
                            </span>
                          )
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={`hidden lg:flex w-full items-center rounded-xl py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors ${
            mini ? 'justify-center' : 'gap-3 px-3'
          }`}
        >
          {collapsed ? <PanelLeftOpenIcon className="w-[18px] h-[18px]" /> : <PanelLeftCloseIcon className="w-[18px] h-[18px]" />}
          {!mini && 'Collapse'}
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          title={mini ? 'Student view' : undefined}
          className={`flex w-full items-center rounded-xl py-2.5 text-[13px] font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors ${
            mini ? 'justify-center' : 'gap-3 px-3'
          }`}
        >
          <ExternalLinkIcon className="w-[18px] h-[18px] shrink-0" />
          {!mini && 'Student view'}
        </button>

        <button
          onClick={handleLogout}
          title={mini ? 'Log out' : undefined}
          className={`flex w-full items-center rounded-xl py-2.5 text-[13px] font-medium text-slate-400 hover:text-[#ff4d5f] hover:bg-[#c20f24]/10 transition-colors ${
            mini ? 'justify-center' : 'gap-3 px-3'
          }`}
        >
          <LogOutIcon className="w-[18px] h-[18px] shrink-0" />
          {!mini && 'Log out'}
        </button>

        {!mini && (
          <div className="flex items-center gap-3 px-3 pt-3 mt-1 border-t border-white/[0.06]">
            <span className="w-8 h-8 rounded-full bg-white/[0.08] text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
              {(user?.name ?? 'A').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[13px] font-semibold text-white truncate">{user?.name ?? 'Administrator'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email ?? 'admin'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F8] text-slate-900">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 bg-[#0C0C0E] transition-[width] duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-40 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <SidebarInner mini={collapsed} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#0C0C0E] text-white">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <img src="/images/pd-logo.png" alt="" className="w-6 h-6 object-contain" />
          </span>
          <span className="font-bold truncate">Pasindu Dissanayake <span className="text-slate-400 font-semibold">ICT</span></span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-slate-300 hover:bg-white/10" aria-label="Menu">
          <MenuIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[82%] bg-[#0C0C0E] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-2 rounded-lg text-slate-400 hover:bg-white/10 z-10"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <SidebarInner mini={false} />
          </div>
        </div>
      )}

      {/* Content */}
      <main className={`transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
        {/* persistent pending-ID banner (every page) — above payments for prominence */}
        {showIdBanner && (
          <Link
            to="/admin/students"
            className="flex items-center gap-3 bg-[#c20f24] text-white px-4 sm:px-8 py-2.5 hover:bg-[#a60d1f] transition-colors"
          >
            <BellRingIcon className="w-4 h-4 shrink-0 animate-pulse" />
            <p className="text-[13px] font-semibold flex-1">
              {pendingIds} student{pendingIds === 1 ? '' : 's'} uploaded an ID awaiting verification
            </p>
            <span className="text-[13px] font-bold flex items-center gap-1 shrink-0">
              Verify now <ArrowRightIcon className="w-4 h-4" />
            </span>
          </Link>
        )}

        {/* persistent pending-payments banner (every page) */}
        {showBanner && (
          <Link
            to="/admin/payments"
            className="flex items-center gap-3 bg-amber-500 text-white px-4 sm:px-8 py-2.5 hover:bg-amber-600 transition-colors"
          >
            <BellRingIcon className="w-4 h-4 shrink-0 animate-pulse" />
            <p className="text-[13px] font-semibold flex-1">
              {pending} payment{pending === 1 ? '' : 's'} waiting for verification
            </p>
            <span className="text-[13px] font-bold flex items-center gap-1 shrink-0">
              Verify now <ArrowRightIcon className="w-4 h-4" />
            </span>
          </Link>
        )}

        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
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
