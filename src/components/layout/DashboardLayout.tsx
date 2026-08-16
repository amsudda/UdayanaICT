import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#242426] dark:bg-black flex p-2 sm:p-3 lg:p-4 transition-colors duration-300">
      
      {/* Floating Dark Sidebar */}
      <Sidebar />
      
      {/* Main white rounded container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F4F5] dark:bg-[#0A0A0A] rounded-[2rem] sm:rounded-[2.5rem] lg:ml-20 overflow-hidden shadow-2xl relative transition-all duration-300">
        
        {/* Navbar inside the container */}
        <Navbar />

        <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-8">
          <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
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
