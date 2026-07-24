import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClassHistoryPage } from './pages/ClassHistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { HelpPage } from './pages/HelpPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupPage } from './pages/SignupPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ExtraClassesPage } from './pages/ExtraClassesPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { WatchPage } from './pages/WatchPage';
import { BuyPackPage } from './pages/BuyPackPage';
import { AdminLayout } from './admin/AdminLayout';
import { AdminOverviewPage } from './admin/pages/AdminOverviewPage';
import { AdminBatchesPage } from './admin/pages/AdminBatchesPage';
import { AdminPaymentsPage } from './admin/pages/AdminPaymentsPage';
import { AdminPacksPage } from './admin/pages/AdminPacksPage';
import { AdminTheoryPage } from './admin/pages/AdminTheoryPage';
import { AdminStudentsPage } from './admin/pages/AdminStudentsPage';
import { AdminStudentDetailPage } from './admin/pages/AdminStudentDetailPage';
import { AdminPromotionsPage } from './admin/pages/AdminPromotionsPage';
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage';
import { AdminFeaturedPage } from './admin/pages/AdminFeaturedPage';
import { AdminMarksPage } from './admin/pages/AdminMarksPage';
import { AdminReviewsPage } from './admin/pages/AdminReviewsPage';
import { AdminBooksPage } from './admin/pages/AdminBooksPage';

function FullSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-apple-light dark:bg-slate-950">
      <div className="w-8 h-8 rounded-full border-2 border-apple-blue border-t-transparent animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <FullSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // A fresh Google sign-up has a profile but hasn't filled in the details yet.
  if (user && user.role === 'student' && !user.profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }
  return <>{children}</>;
}

/** Authenticated, but does NOT require a completed profile (the form itself). */
function AuthedRoute({ children }: { children: ReactNode }) {
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
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* First-run profile form for new Google sign-ups */}
        <Route
          path="/complete-profile"
          element={
            <AuthedRoute>
              <CompleteProfilePage />
            </AuthedRoute>
          }
        />

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

        {/* Standalone checkout page for a pack */}
        <Route
          path="/dashboard/buy/:packId"
          element={
            <ProtectedRoute>
              <BuyPackPage />
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
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="students/:id" element={<AdminStudentDetailPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="books" element={<AdminBooksPage />} />
          <Route path="featured" element={<AdminFeaturedPage />} />
          <Route path="marks" element={<AdminMarksPage />} />
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
