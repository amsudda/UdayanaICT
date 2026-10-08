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
  CalendarClockIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PackageIcon
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
      { name: 'Papers', path: '/dashboard/papers', icon: FileTextIcon },
      { name: 'Tute Tracking', path: '/dashboard/tute-tracking', icon: PackageIcon }
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

// v2: the first version defaulted to folded, so the panel opened as a bare
// icon rail and the full panel only appeared on hover — it read as the old
// sidebar. Open is the default now, and the new key ignores any folded
// preference stored while that was the behaviour.
const PIN_KEY = 'sidebar:pinned:v2';

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [xp, setXp] = useState(0);
  // Open unless the student has folded it themselves. Once folded, it stays
  // folded and opens on hover, and that choice sticks between visits.
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem(PIN_KEY) !== '0'; } catch { return true; }
  });
  const [hovered, setHovered] = useState(false);
  // You have to be hovering the panel to reach the fold button, so hover
  // alone would hold it open and the click would look like it did nothing.
  // Unpinning disarms hover until the pointer leaves and comes back.
  const [hoverArmed, setHoverArmed] = useState(true);
  const folded = !pinned && !(hovered && hoverArmed);

  const togglePinned = () => {
    // computed outside the updater: React may run an updater more than once,
    // and state set inside one is not guaranteed to stick
    const next = !pinned;
    setPinned(next);
    if (!next) {
      // fold now, even though the pointer is still resting on the panel
      setHovered(false);
      setHoverArmed(false);
    }
  };

  useEffect(() => {
    try { localStorage.setItem(PIN_KEY, pinned ? '1' : '0'); } catch { /* private mode */ }
  }, [pinned]);
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
          title={folded ? item.name : undefined}
          className={({ isActive }) => `
            flex items-center rounded-xl transition-all duration-300
            ${folded ? 'justify-center py-2.5 short:py-2' : 'px-4 py-2 short:py-[3px]'}
            ${isActive ? 'bg-[#dc2626] text-white shadow-lg shadow-red-500/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}
          `}
        >
          {({ isActive }) => (
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 short:w-4 short:h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              {!folded && <span className="text-[17px] short:text-[15px] font-medium whitespace-nowrap">{item.name}</span>}
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    // The outer slot matches the panel, so opening it moves the page across
    // with it rather than covering the content.
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setHoverArmed(true); }}
      className={`hidden lg:block shrink-0 relative h-[calc(100vh-2rem)] short:h-[calc(100vh-1.5rem)] sticky top-0 z-40 transition-[width] duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${folded ? 'w-[84px]' : 'w-[260px]'}`}
    >
    <aside
      className={`absolute inset-y-0 left-0 flex flex-col rounded-[2rem] py-5 short:py-4 bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.05)] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${folded ? 'w-[84px] px-3' : 'w-[260px] px-4'}`}
    >
      {/* Logo + fold toggle */}
      <div className={`flex items-center mb-5 short:mb-3 ${folded ? 'flex-col gap-2' : 'gap-2 px-2'}`}>
        <div
          className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 ${folded ? '' : 'flex-1'}`}
          onClick={() => navigate('/')}
        >
          <img
            src="/images/pd-logo.png"
            alt="Pasindu Dissanayake"
            className="w-10 h-10 short:w-8 short:h-8 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
          />
          {!folded && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg short:text-base leading-tight tracking-tight text-zinc-900 transition-colors">
                Pasindu
              </span>
              <span className="text-sm short:text-xs font-semibold text-zinc-500">
                Dissanayake
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={togglePinned}
          title={pinned ? 'Unpin menu (folds by itself)' : 'Keep menu open'}
          aria-label={pinned ? 'Unpin menu' : 'Keep menu open'}
          aria-pressed={pinned}
          className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${pinned ? 'text-[#c20f24] bg-red-50 hover:bg-red-100' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
        >
          {pinned ? <PanelLeftCloseIcon className="w-4 h-4" /> : <PanelLeftOpenIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Profile card — opens the rank page */}
      <button
        type="button"
        onClick={() => navigate('/dashboard/rank')}
        title={folded ? `${rp.current.name} - ${xp.toLocaleString()} XP` : undefined}
        className={`w-full text-left mb-4 short:mb-3 rounded-2xl relative overflow-hidden group border border-red-100 bg-gradient-to-br from-white via-white to-red-50 hover:border-red-200 transition-colors ${folded ? 'p-2 flex justify-center' : 'p-3 short:p-2.5'}`}
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
          {!folded && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 truncate leading-tight">{user?.name || 'Student'}</p>
              {user?.studentId && <p className="text-[10px] font-medium text-zinc-500 truncate mt-0.5 tracking-wide">{user.studentId}</p>}
            </div>
          )}
        </div>

        <div className={`relative mt-3 short:mt-2 ${folded ? 'hidden' : ''}`}>
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
            {folded ? (
              <div className="mx-auto mb-2 h-px w-6 bg-zinc-200" title={group.label} />
            ) : (
              <p className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 short:mb-1 short:text-[9px]">{group.label}</p>
            )}
            {renderNavItems(group.items)}
          </div>
        ))}
      </div>

      {/* Exam countdown — hidden until the student's exam date is known */}
      {daysLeft !== null && (
        <div
          title={folded ? `A/L Exam - ${examDateStr} - ${daysLeft} days left` : undefined}
          className={`mt-3 short:mt-2 shrink-0 flex items-center rounded-2xl bg-zinc-50 border border-zinc-100 ${folded ? 'justify-center py-2' : 'gap-3 px-3.5 py-2.5 short:py-1.5'}`}
        >
          <span className={`w-8 h-8 short:w-7 short:h-7 rounded-lg bg-red-50 border border-red-100 items-center justify-center shrink-0 ${folded ? 'hidden' : 'flex'}`}>
            <CalendarClockIcon className="w-4 h-4 text-red-500" />
          </span>
          <div className={`flex-1 min-w-0 ${folded ? 'hidden' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">A/L Exam</p>
            <p className="text-[11px] text-zinc-500 truncate leading-tight mt-0.5">{examDateStr}</p>
          </div>
          <div className={`shrink-0 leading-none ${folded ? 'text-center' : 'text-right'}`}>
            <span className="block text-lg font-black text-zinc-900 tabular-nums">{daysLeft}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5">{daysLeft === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
      )}

      {/* Log out. Reads as one more row of the menu rather than a panel of
          its own, now that the red card it used to sit on is gone. */}
      <button
        onClick={handleLogout}
        title={folded ? 'Log Out' : undefined}
        aria-label="Log Out"
        className={`mt-3 short:mt-2 shrink-0 flex items-center rounded-xl text-zinc-500 hover:text-[#c20f24] hover:bg-red-50 transition-colors ${
          folded ? 'justify-center py-2.5 short:py-2' : 'px-4 py-2.5 short:py-2 gap-3'
        }`}
      >
        <LogOutIcon className="w-5 h-5 short:w-4 short:h-4 shrink-0" />
        {!folded && <span className="text-[15px] short:text-[13px] font-medium whitespace-nowrap">Log Out</span>}
      </button>
    </aside>
    </div>
  );
}
