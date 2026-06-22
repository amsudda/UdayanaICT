import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClassHistoryPage } from './pages/ClassHistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { HelpPage } from './pages/HelpPage';
import { LandingPage } from './pages/LandingPage';
import { LiveClassesPage } from './pages/LiveClassesPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupPage } from './pages/SignupPage';
import { ExtraClassesPage } from './pages/ExtraClassesPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { WatchPage } from './pages/WatchPage';
import { AdminLayout } from './admin/AdminLayout';
import { AdminOverviewPage } from './admin/pages/AdminOverviewPage';
import { AdminBatchesPage } from './admin/pages/AdminBatchesPage';
import { AdminPaymentsPage } from './admin/pages/AdminPaymentsPage';
import { AdminPacksPage } from './admin/pages/AdminPacksPage';
import { AdminTheoryPage } from './admin/pages/AdminTheoryPage';
import { AdminLivePage } from './admin/pages/AdminLivePage';
import { AdminStudentsPage } from './admin/pages/AdminStudentsPage';
import { AdminPromotionsPage } from './admin/pages/AdminPromotionsPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';
import { AdminFeaturedPage } from './admin/pages/AdminFeaturedPage';

function FullSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-apple-light dark:bg-slate-950">
      <div className="w-8 h-8 rounded-full border-2 border-apple-blue border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <FullSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Inner router component — needs to be inside BrowserRouter to use useLocation */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="courses" element={<MyCoursesPage />} />
          <Route path="extra-classes" element={<ExtraClassesPage />} />
          <Route path="live" element={<LiveClassesPage />} />
          <Route path="history" element={<ClassHistoryPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Standalone watch page — outside DashboardLayout (no navbar/sidebar) */}
        <Route
          path="/dashboard/watch/:packId"
          element={
            <ProtectedRoute>
              <WatchPage />
            </ProtectedRoute>
          }
        />

        {/* ── Admin panel (tutor only) ── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="batches" element={<AdminBatchesPage />} />
          <Route path="packs" element={<AdminPacksPage />} />
          <Route path="theory" element={<AdminTheoryPage />} />
          <Route path="live" element={<AdminLivePage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="featured" element={<AdminFeaturedPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
