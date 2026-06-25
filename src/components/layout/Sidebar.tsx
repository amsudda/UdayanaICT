import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  CreditCardIcon,
  HeadphonesIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
  VideoIcon,
  ShoppingCartIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const menuGroups = [
  {
    label: 'Learning',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboardIcon,
        end: true
      },
      {
        name: 'My Classes',
        path: '/dashboard/courses',
        icon: BookOpenIcon
      },
      {
        name: 'Live Classes',
        path: '/dashboard/live',
        icon: VideoIcon
      },
      {
        name: 'Extra Classes Store',
        path: '/dashboard/extra-classes',
        icon: ShoppingCartIcon
      }
    ]
  },
  {
    label: 'Student Account',
    items: [
      {
        name: 'My Profile',
        path: '/dashboard/profile',
        icon: UserIcon
      },
      {
        name: 'Payments',
        path: '/dashboard/payments',
        icon: CreditCardIcon
      },
      {
        name: 'Class History',
        path: '/dashboard/history',
        icon: HistoryIcon
      },
      {
        name: 'Help',
        path: '/dashboard/help',
        icon: HeadphonesIcon
      }
    ]
  }
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name ?? '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col w-72 h-[calc(100vh-4rem)] fixed left-0 top-16 bg-white dark:bg-slate-950 border-r border-gray-100 dark:border-slate-800 py-5 px-4 transition-colors duration-300">
      <div className="rounded-3xl bg-gray-50 dark:bg-slate-900 p-4 text-apple-text dark:text-white border border-gray-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-colors duration-300">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.name ?? 'Student'}
              className="h-14 w-14 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c20f24]/10 dark:bg-white/10 shrink-0 text-[#c20f24] dark:text-white font-bold">
              {initials || <UserIcon className="w-7 h-7" />}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-apple-text dark:text-white">{user?.name}</p>
            <p className="truncate text-sm text-apple-subtext dark:text-slate-300">{user?.email}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white dark:bg-white/10 px-4 py-3 border border-gray-100 dark:border-transparent">
          <p className="text-xs uppercase tracking-[0.18em] text-apple-subtext dark:text-slate-300">Student ID</p>
          <p className="mt-1 text-xl font-bold tracking-wide text-apple-text dark:text-white">{user?.studentId}</p>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto pr-1">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {group.label}
            </p>

            <div className="space-y-1.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200
                    ${isActive ? 'bg-[#c20f24]/10 text-[#c20f24] dark:bg-[#c20f24]/20 dark:text-apple-light' : 'text-apple-subtext dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900 hover:text-apple-text dark:hover:text-apple-light'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-5 border-t border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOutIcon className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
