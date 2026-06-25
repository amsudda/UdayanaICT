import { NavLink } from 'react-router-dom';
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  VideoIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  UserIcon
} from 'lucide-react';

export function MobileNav() {
  const navItems = [
    { name: 'Home',      path: '/dashboard',              icon: LayoutDashboardIcon, end: true },
    { name: 'Classes',   path: '/dashboard/courses',      icon: BookOpenIcon },
    { name: 'Live',      path: '/dashboard/live',         icon: VideoIcon },
    { name: 'Store',     path: '/dashboard/extra-classes',icon: ShoppingCartIcon },
    { name: 'Payments',  path: '/dashboard/payments',     icon: CreditCardIcon },
    { name: 'Profile',   path: '/dashboard/profile',      icon: UserIcon }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 transition-colors duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => (
          <NavLink key={item.name} to={item.path} end={item.end} className="flex-1 flex flex-col items-center justify-center h-full min-w-0 touch-manipulation">
            {({ isActive }) => (
              <>
                <div className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-[#c20f24]/10 dark:bg-[#c20f24]/20' : ''
                }`}>
                  <item.icon className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-[#c20f24]' : 'text-apple-subtext dark:text-slate-400'
                  }`} />
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 transition-colors duration-200 ${
                  isActive ? 'text-[#c20f24]' : 'text-apple-subtext dark:text-slate-500'
                }`}>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
