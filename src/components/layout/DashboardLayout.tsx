import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black flex transition-colors duration-300">
      
      {/* Floating Sidebar */}
      <Sidebar />
      
      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa] dark:bg-black relative transition-all duration-300">
        
        {/* Navbar inside the container */}
        <Navbar />

        <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-8">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-6 lg:pb-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ willChange: 'opacity, transform' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
