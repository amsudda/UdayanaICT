import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuIcon,
  XIcon,
  BookOpenIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  HistoryIcon,
  HeadphonesIcon,
  LogOutIcon,
  LayoutDashboardIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import { NotificationBell } from '../shared/NotificationBell';
import { Button } from '../ui/Button';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const displayName = user?.name || 'Student';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // close the mobile menu whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const ThemeToggle = ({ className = '' }: { className?: string }) => (
    <button
      onClick={() => setIsDarkMode((d) => !d)}
      className={`p-2 rounded-full text-apple-text dark:text-apple-light hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${className}`}
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );

  const accountLinks = [
    ...(isAdmin ? [{ name: 'Admin Panel', path: '/admin', icon: LayoutDashboardIcon }] : []),
    { name: 'My Profile', path: '/dashboard/profile', icon: UserIcon },
    { name: 'Class History', path: '/dashboard/history', icon: HistoryIcon },
    { name: 'Help', path: '/dashboard/help', icon: HeadphonesIcon }
  ];

  return (
    <nav className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={isDashboard ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-apple-blue rounded-xl flex items-center justify-center text-white font-bold">
              <BookOpenIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-apple-text dark:text-apple-light transition-colors duration-300">
              Udayana ICT
            </span>
          </Link>

          {!isDashboard ? (
            <div className="hidden md:flex items-center gap-8">
              <a href="#promos" className="text-sm font-medium text-apple-subtext dark:text-slate-400 hover:text-apple-text dark:hover:text-apple-light transition-colors">Promotions</a>
              <a href="#reviews" className="text-sm font-medium text-apple-subtext dark:text-slate-400 hover:text-apple-text dark:hover:text-apple-light transition-colors">Reviews</a>
              <a href="#features" className="text-sm font-medium text-apple-subtext dark:text-slate-400 hover:text-apple-text dark:hover:text-apple-light transition-colors">Why Us</a>
              <a href="#contact" className="text-sm font-medium text-apple-subtext dark:text-slate-400 hover:text-apple-text dark:hover:text-apple-light transition-colors">Contact</a>
            </div>
          ) : null}

          {/* desktop right cluster */}
          <div className="hidden md:flex items-center gap-4">
            {isDashboard ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm font-semibold text-apple-blue hover:underline"
                  >
                    Admin
                  </Link>
                )}
                <NotificationBell />
                <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-2 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-apple-text dark:text-apple-light">{displayName}</p>
                    <p className="text-xs text-apple-subtext dark:text-slate-400">{user?.studentId || 'Student'}</p>
                  </div>
                  {user?.avatar ? (
                    <img src={user.avatar} alt={displayName} className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-800 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-apple-blue/10 dark:bg-white/10 border border-gray-200 dark:border-slate-800 flex items-center justify-center text-apple-blue dark:text-apple-light font-semibold text-sm">
                      {initials}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="dark:text-apple-light dark:hover:bg-slate-800">Log Out</Button>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="dark:text-apple-light dark:hover:bg-slate-800">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* mobile right cluster */}
          <div className="md:hidden flex items-center gap-1">
            {isDashboard && <NotificationBell />}
            {!isDashboard && <ThemeToggle />}
            <button
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              className="p-2 rounded-md text-apple-text dark:text-apple-light hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── mobile menus ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-x-0 bottom-0 top-16 bg-black/30 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute w-full bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-lg z-50"
            >
              {isDashboard ? (
                <div className="px-4 py-4 space-y-4">
                  {/* account header */}
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={displayName} className="w-12 h-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-apple-blue/10 dark:bg-white/10 flex items-center justify-center text-apple-blue dark:text-apple-light font-bold">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-apple-text dark:text-apple-light truncate">{displayName}</p>
                      <p className="text-xs text-apple-subtext dark:text-slate-400 truncate">{user?.studentId || 'Student'}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-1">
                    {accountLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <link.icon className="w-5 h-5 text-apple-subtext dark:text-slate-400" />
                        {link.name}
                      </Link>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOutIcon className="w-5 h-5" />
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="px-4 pt-2 pb-6 space-y-2">
                  <a href="#promos" className="block px-3 py-2 rounded-md text-base font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800">Promotions</a>
                  <a href="#reviews" className="block px-3 py-2 rounded-md text-base font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800">Reviews</a>
                  <a href="#features" className="block px-3 py-2 rounded-md text-base font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800">Why Us</a>
                  <a href="#contact" className="block px-3 py-2 rounded-md text-base font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800">Contact</a>
                  <div className="pt-4 flex flex-col gap-3">
                    <Link to="/login" className="w-full"><Button variant="secondary" className="w-full">Log In</Button></Link>
                    <Link to="/signup" className="w-full"><Button className="w-full">Sign Up</Button></Link>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
