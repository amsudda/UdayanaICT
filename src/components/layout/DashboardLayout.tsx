import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-apple-light dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar />

      <div className="flex flex-1 min-w-0">
        <Sidebar />
        {/* min-w-0 lets main shrink to the viewport instead of its content's
            intrinsic width — prevents horizontal page overflow on mobile.
            pb-24 keeps content clear of the fixed mobile bottom nav. */}
        <main className="flex-1 min-w-0 lg:ml-72 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>);

}
