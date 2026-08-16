import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  CreditCardIcon,
  HeadphonesIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
  ShoppingCartIcon,
  FileTextIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const menuGroups = [
  {
    label: 'Learning',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboardIcon, end: true },
      { name: 'My Classes', path: '/dashboard/courses', icon: BookOpenIcon },
      { name: 'Lesson Store', path: '/dashboard/extra-classes', icon: ShoppingCartIcon },
      { name: 'Papers', path: '/dashboard/papers', icon: FileTextIcon }
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
  const [isHovered, setIsHovered] = useState(false);

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
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hidden lg:flex flex-col h-[calc(100vh-2rem)] sticky top-4 bg-[#18181B] dark:bg-[#121212] rounded-[2rem] py-6 px-3 shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-40"
      style={{ width: isHovered ? '280px' : '88px' }}
    >
      {/* Top Logo */}
      <div className="flex items-center gap-3 px-1 mb-10 overflow-hidden shrink-0 mt-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center ml-[2px]">
          <img src="/images/pd-logo.png" alt="Logo" className="w-9 h-9 object-contain drop-shadow-md" />
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
              className="whitespace-nowrap min-w-0"
            >
              <span className="font-bold tracking-tight text-[1.05rem] text-white">
                Pasindu Dissanayake
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-8">
        {menuGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <AnimatePresence>
              {isHovered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="px-5 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1 whitespace-nowrap"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5 px-2">
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-1.5 py-1.5 rounded-2xl transition-all duration-300
                    ${isActive ? '' : 'hover:bg-white/5'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active State Background Circle around Icon */}
                      <div className={`relative shrink-0 flex items-center justify-center w-[42px] h-[42px] rounded-[14px] transition-all ${isActive ? 'text-white' : 'text-white/40'}`}>
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute inset-0 bg-gradient-to-br from-[#FF2E54] to-[#c20f24] rounded-[14px] shadow-[0_0_18px_rgba(255,46,84,0.5)]"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <item.icon className="w-5 h-5 relative z-10" />
                      </div>
                      
                      <AnimatePresence>
                        {isHovered && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                            className={`relative z-10 whitespace-nowrap text-[15px] ${isActive ? 'text-white font-bold' : 'text-white/40 font-semibold group-hover:text-white/80'}`}
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 px-2 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="relative w-full flex items-center gap-4 px-3.5 py-3 rounded-2xl text-[15px] font-semibold text-white/40 hover:text-[#FF2E54] hover:bg-white/5 transition-all duration-300 group overflow-hidden"
        >
          <div className="relative z-10 shrink-0 flex items-center justify-center w-5 h-5 ml-[3px]">
            <LogOutIcon className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                className="relative z-10 whitespace-nowrap"
              >
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
}
