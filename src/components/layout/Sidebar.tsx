import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
  FileTextIcon,
  TrophyIcon,
  ShoppingCartIcon,
  ClipboardListIcon,
  HistoryIcon,
  HeadphonesIcon,
  UsersIcon,
  AwardIcon,
  CalendarClockIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useEffect, useState } from 'react';
import { loadMyXp } from '../../data/xp';
import { rankForXp } from '../../data/ranks';
import { useExamCountdown } from '../../data/examCountdown';
import { RankEmblem } from '../achievements/AchievementBadge';

const menuGroups = [
  {
    label: 'Learning',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon, end: true },
      { name: 'My Classes', path: '/dashboard/courses', icon: BookOpenIcon },
      { name: 'AQuiz', path: '/dashboard/quizzes', icon: ClipboardListIcon },
      { name: 'Lesson Store', path: '/dashboard/extra-classes', icon: ShoppingCartIcon },
      { name: 'Papers', path: '/dashboard/papers', icon: FileTextIcon }
    ]
  },
  {
    label: 'Progress',
    items: [
      { name: 'Rank', path: '/dashboard/rank', icon: TrophyIcon },
      { name: 'Leaderboard', path: '/dashboard/leaderboard', icon: UsersIcon },
      { name: 'Achievements', path: '/dashboard/achievements', icon: AwardIcon }
    ]
  },
  {
    label: 'Account',
    items: [
      { name: 'Profile', path: '/dashboard/profile', icon: UserIcon },
      { name: 'Payments', path: '/dashboard/payments', icon: CreditCardIcon },
      { name: 'History', path: '/dashboard/history', icon: HistoryIcon },
      { name: 'Help', path: '/dashboard/help', icon: HeadphonesIcon }
    ]
  }
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [xp, setXp] = useState(0);
  const { daysLeft, examDateStr } = useExamCountdown();

  useEffect(() => {
    if (!user) return;
    loadMyXp().then(setXp);
  }, [user]);

  const rp = rankForXp(xp);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name ?? 'S')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const renderNavItems = (items: any[]) => (
    <div className="flex flex-col gap-1 short:gap-0">
      {items.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          end={item.end}
          className={({ isActive }) => `
            flex items-center justify-between px-4 py-2 short:py-[3px] rounded-xl transition-all duration-300
            ${isActive ? 'bg-[#dc2626] text-white shadow-lg shadow-red-500/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}
          `}
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 short:w-4 short:h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="text-[14px] short:text-[12px] font-medium">{item.name}</span>
              </div>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <aside
      className="hidden lg:flex flex-col h-[calc(100vh-2rem)] sticky top-4 left-4 ml-4 rounded-3xl py-5 short:py-4 px-4 z-40 bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.05)] w-[260px] overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-5 short:mb-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
        <img
          src="/images/pd-logo.png"
          alt="Pasindu Dissanayake"
          className="w-10 h-10 short:w-8 short:h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
        />
        <div className="flex flex-col">
          <span className="font-bold text-lg short:text-base leading-tight tracking-tight text-zinc-900 transition-colors">
            Pasindu
          </span>
          <span className="text-sm short:text-xs font-semibold text-zinc-500">
            Dissanayake
          </span>
        </div>
      </div>

      {/* Profile card — opens the rank page */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/rank')}
        className="w-full text-left mb-4 short:mb-3 p-3 short:p-2.5 rounded-2xl relative overflow-hidden group border border-red-100 bg-gradient-to-br from-white via-white to-red-50 hover:border-red-200 transition-colors"
      >
        <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-red-400/10 blur-2xl group-hover:bg-red-400/20 transition-colors" />

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-10 h-10 short:w-9 short:h-9 rounded-full object-cover ring-2 ring-red-500/40" />
            ) : (
              <div className="w-10 h-10 short:w-9 short:h-9 rounded-full bg-gradient-to-br from-red-500 to-red-800 ring-2 ring-red-500/30 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-900/40">
                {initials}
              </div>
            )}
            <RankEmblem rankKey={rp.current.key} size={24} title={rp.current.name} className="absolute -bottom-2 -right-2 drop-shadow" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 truncate leading-tight">{user?.name || 'Student'}</p>
            {user?.studentId && <p className="text-[10px] font-medium text-zinc-500 truncate mt-0.5 tracking-wide">{user.studentId}</p>}
          </div>
        </div>

        <div className="relative mt-3 short:mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{rp.current.name}</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              <span className="text-zinc-800 font-semibold">{xp.toLocaleString()}</span> / {(rp.next ? rp.next.minXp : rp.current.minXp).toLocaleString()} XP
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-[width] duration-700"
              style={{ width: `${rp.next ? Math.max(rp.progressPct, 3) : 100}%` }}
            />
          </div>
        </div>
      </button>

      {/* data-lenis-prevent: the page-wide smooth scroll (Lenis) captures wheel
          events, so without it the mouse wheel can never scroll this menu. */}
      <div data-lenis-prevent className="sidebar-scroll flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 short:gap-1.5">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 short:mb-1 short:text-[9px]">{group.label}</p>
            {renderNavItems(group.items)}
          </div>
        ))}
      </div>

      {/* Exam countdown — hidden until the student's exam date is known */}
      {daysLeft !== null && (
        <div className="mt-3 short:mt-2 shrink-0 flex items-center gap-3 px-3.5 py-2.5 short:py-1.5 rounded-2xl bg-zinc-50 border border-zinc-100">
          <span className="w-8 h-8 short:w-7 short:h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <CalendarClockIcon className="w-4 h-4 text-red-500" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">A/L Exam</p>
            <p className="text-[11px] text-zinc-500 truncate leading-tight mt-0.5">{examDateStr}</p>
          </div>
          <div className="text-right shrink-0 leading-none">
            <span className="block text-lg font-black text-zinc-900 tabular-nums">{daysLeft}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5">{daysLeft === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      )}

      {/* Bottom Graphic & Logout */}
      <div className="mt-4 short:mt-3 shrink-0 relative rounded-2xl overflow-hidden h-24 short:h-[72px] flex flex-col justify-end p-4 bg-gradient-to-br from-[#c20f24] to-[#7a0c17] shadow-md shadow-red-900/20">
         <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-xl z-0" />
         <div className="relative z-10 pr-8">
            <p className="text-white text-xs font-semibold leading-tight italic">Small steps<br/>every day<br/>create big results.</p>
         </div>
         <button onClick={handleLogout} className="absolute bottom-3 right-3 w-6 h-6 bg-white/20 hover:bg-white/35 rounded-full flex items-center justify-center text-white transition-colors z-20">
            <LogOutIcon className="w-3 h-3 ml-0.5" />
         </button>
      </div>
    </aside>
  );
}
