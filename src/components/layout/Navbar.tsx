import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuIcon,
  XIcon,
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

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isLanding = location.pathname === '/';

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
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /* Only transform into pill on the landing page */
  const isPill = isLanding && scrolled;

  const navLinks = [
    { label: 'Promotions', href: '#promos' },
    { label: 'Books', href: '#books' },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Why Us', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ];

  const accountLinks = [
    ...(isAdmin ? [{ name: 'Admin Panel', path: '/admin', icon: LayoutDashboardIcon }] : []),
    { name: 'My Profile', path: '/dashboard/profile', icon: UserIcon },
    { name: 'Class History', path: '/dashboard/history', icon: HistoryIcon },
    { name: 'Help', path: '/dashboard/help', icon: HeadphonesIcon }
  ];

  return (
    /* Sticky wrapper — always occupies space so content doesn't jump */
    <div className="sticky top-0 z-30 w-full pointer-events-none">
      <div
        className={`w-full flex justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isPill ? 'px-4 pt-3' : 'px-0 pt-0'
        }`}
      >
        <motion.nav
          layout
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pointer-events-auto"
          style={{
            width: isPill ? 'min(96%, 100%)' : '100%',
            borderRadius: isPill ? '16px' : '0px',
            background: isPill
              ? isDarkMode
                ? 'rgba(15,23,42,0.75)'
                : 'rgba(255,255,255,0.72)'
              : isLanding && !scrolled
              ? 'transparent'
              : isDarkMode
              ? 'rgba(2,6,23,0.80)'
              : 'rgba(255,255,255,0.80)',
            backdropFilter: (isPill || scrolled) ? 'blur(40px) saturate(200%) brightness(1.05)' : 'none',
            WebkitBackdropFilter: (isPill || scrolled) ? 'blur(40px) saturate(200%) brightness(1.05)' : 'none',
            border: isPill
              ? isDarkMode
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(255,255,255,0.9)'
              : 'none',
            boxShadow: isPill
              ? isDarkMode
                ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 8px 32px rgba(0,0,0,0.1), 0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)'
              : scrolled
              ? '0 1px 0 rgba(0,0,0,0.06)'
              : 'none',
          }}
        >
          <div className={`flex justify-between items-center transition-all duration-500 ${
            isPill ? 'h-[52px] px-5' : 'h-16 px-4 sm:px-6 lg:px-10'
          }`}>

            {/* Logo */}
            <Link to={isDashboard ? '/dashboard' : '/'} className="flex items-center gap-2 group flex-shrink-0">
              <motion.img
                src="/images/pd-logo.png"
                alt="Pasindu Dissanayake"
                className="object-contain flex-shrink-0"
                animate={{ width: isPill ? 28 : 36, height: isPill ? 28 : 36 }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.08, rotate: -4 }}
              />
              <motion.span
                animate={{ fontSize: isPill ? '0.9rem' : '1.15rem' }}
                transition={{ duration: 0.45 }}
                className={`font-bold tracking-tight whitespace-nowrap ${
                  isLanding && !scrolled
                    ? 'text-white dark:text-white'
                    : 'text-apple-text dark:text-apple-light'
                }`}
              >
                Pasindu Dissanayake
              </motion.span>
            </Link>

            {/* Desktop nav links — hidden in pill mode to save space, or shown compactly */}
            {!isDashboard && (
              <div className="hidden md:flex items-center gap-0">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative px-2.5 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 group ${
                      isLanding && !scrolled
                        ? 'text-white/75 hover:text-white hover:bg-white/10'
                        : 'text-apple-subtext dark:text-slate-400 hover:text-apple-text dark:hover:text-apple-light hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c20f24] opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200" />
                  </a>
                ))}
              </div>
            )}

            {/* Right cluster */}
            <div className="hidden md:flex items-center gap-2">
              {isDashboard ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" className="text-sm font-semibold text-[#c20f24] hover:underline">
                      Admin
                    </Link>
                  )}
                  <NotificationBell />
                  <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-2 pl-1.5 pr-1 py-0.5 bg-gray-50 dark:bg-slate-800 rounded-full border border-gray-200/60 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="text-right pr-1 hidden sm:block">
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{displayName}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{user?.studentId || 'Student'}</p>
                    </div>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={displayName} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-700 object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-[#c20f24] flex items-center justify-center text-white font-bold text-xs border-2 border-white dark:border-slate-700">
                        {initials}
                      </div>
                    )}
                  </div>
                  <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2">
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  {/* Theme toggle */}
                  <button
                    onClick={() => setIsDarkMode((d) => !d)}
                    className={`p-1.5 rounded-full transition-colors ${
                      isLanding && !scrolled
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-apple-subtext dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    {isDarkMode ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
                  </button>

                  <Link to="/login">
                    <button
                      className={`h-8 px-4 text-sm font-semibold rounded-full transition-all duration-200 ${
                        isLanding && !scrolled
                          ? 'text-white/90 hover:text-white hover:bg-white/10 border border-white/20'
                          : 'text-apple-text dark:text-apple-light border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      Log In
                    </button>
                  </Link>

                  <Link to="/signup">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="h-8 px-4 text-sm font-semibold rounded-full bg-[#c20f24] hover:bg-[#9c0c1d] text-white shadow-sm hover:shadow-[0_4px_14px_rgba(194,15,36,0.45)] transition-all duration-200"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile right cluster */}
            <div className="md:hidden flex items-center gap-1">
              {isDashboard && <NotificationBell />}
              {!isDashboard && (
                <button
                  onClick={() => setIsDarkMode((d) => !d)}
                  className={`p-1.5 rounded-full transition-colors ${
                    isLanding && !scrolled ? 'text-white/80' : 'text-apple-text dark:text-apple-light'
                  }`}
                >
                  {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen((o) => !o)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLanding && !scrolled
                    ? 'text-white hover:bg-white/10'
                    : 'text-apple-text dark:text-apple-light hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
                aria-label="Menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isMobileMenuOpen ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.12 }}>
                      <XIcon className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.12 }}>
                      <MenuIcon className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/20 z-40 pointer-events-auto"
              style={{ top: isPill ? '72px' : '64px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-x-3 z-50 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden pointer-events-auto"
              style={{ top: isPill ? '75px' : '68px' }}
            >
              {isDashboard ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 p-2">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={displayName} className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-400 to-[#c20f24] flex items-center justify-center text-white font-bold">
                        {initials}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-apple-text dark:text-apple-light">{displayName}</p>
                      <p className="text-xs text-apple-subtext dark:text-slate-400">{user?.studentId || 'Student'}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-2 space-y-0.5">
                    {accountLinks.map((link) => (
                      <Link key={link.name} to={link.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <link.icon className="w-4 h-4 text-apple-subtext dark:text-slate-400" />
                        {link.name}
                      </Link>
                    ))}
                  </div>
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <LogOutIcon className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <div className="space-y-0.5 mb-3">
                    {navLinks.map((link, i) => (
                      <motion.a
                        key={link.href}
                        href={link.href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.18 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c20f24] flex-shrink-0" />
                        {link.label}
                      </motion.a>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex flex-col gap-2 pb-1">
                    <Link to="/login" className="w-full">
                      <button className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-apple-text dark:text-apple-light hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        Log In
                      </button>
                    </Link>
                    <Link to="/signup" className="w-full">
                      <button className="w-full h-11 rounded-xl bg-[#c20f24] hover:bg-[#9c0c1d] text-white text-sm font-semibold shadow-md transition-colors">
                        Sign Up
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
