import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import { ProtectedRoute } from './components/shared/index.jsx';
import { useAuth } from './hooks/useAuth';

// Role Guards & Traps
import {
  OwnerTrapGuard,
  OwnerRoute,
  OwnerOnboardingGuard,
  OwnerPendingGuard,
  StudentOnlyGuard,
} from './components/auth/RoleGuards.jsx';

// Pages
import Home from './pages/Home.jsx';
import FindPG from './pages/FindPG.jsx';
import About from './pages/About.jsx';
import PGDetails from './pages/PGDetails.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import OtpVerification from './pages/OtpVerification.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import ListYourPG from './pages/ListYourPG.jsx';
import Notifications from './pages/Notifications.jsx';
import SavedPGs from './pages/SavedPGs.jsx';
import TermsOfService from './pages/LegalTerms.jsx';
import PrivacyPolicy from './pages/LegalPrivacy.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AalayaAIAssistant from './components/ai/AalayaAIAssistant.jsx';

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx';
import AddPG from './pages/owner/AddPG.jsx';
import EditPG from './pages/owner/EditPG.jsx';
import OwnerPending from './pages/owner/OwnerPending.jsx';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminPending from './pages/admin/AdminPending.jsx';
import AdminAllPGs from './pages/admin/AdminAllPGs.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminNotifications from './pages/admin/AdminNotifications.jsx';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [pathname]);
  return null;
}

// Pages that use the standard Navbar + Footer layout
const ADMIN_PATHS = ['/admin'];
const AUTH_PATHS = ['/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password', '/auth/callback'];

function AppLayout({ children }) {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const isAdmin = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isOwner = currentUser?.role === 'owner';
  const isOwnerPending = pathname === '/owner/pending';

  if (isAdmin) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!isAuth && !isOwnerPending && <Footer />}
      {!isAdmin && !isOwner && !isOwnerPending && <AalayaAIAssistant />}
    </div>
  );
}

// 404 page
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-16">
      <div className="text-center px-4">
        <div className="text-8xl font-display font-bold text-primary-100 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h1>
        <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" className="btn-primary inline-block">Go Home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AppLayout>
        <Routes>
          {/* Public & Student Browsing (Guarded against Owner leak) */}
          <Route
            path="/"
            element={
              <OwnerTrapGuard>
                <Home />
              </OwnerTrapGuard>
            }
          />
          <Route
            path="/find-pg"
            element={
              <OwnerTrapGuard>
                <FindPG />
              </OwnerTrapGuard>
            }
          />
          <Route
            path="/about"
            element={
              <OwnerTrapGuard>
                <About />
              </OwnerTrapGuard>
            }
          />
          <Route
            path="/pg/:id"
            element={
              <OwnerTrapGuard>
                <PGDetails />
              </OwnerTrapGuard>
            }
          />

          {/* Unified Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Legal Pages */}
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Owner Traps & Onboarding */}
          <Route
            path="/list-your-pg"
            element={
              <OwnerOnboardingGuard>
                <ListYourPG />
              </OwnerOnboardingGuard>
            }
          />
          <Route
            path="/owner/pending"
            element={
              <OwnerPendingGuard>
                <OwnerPending />
              </OwnerPendingGuard>
            }
          />

          {/* Student Protected Silo */}
          <Route
            path="/saved-pgs"
            element={
              <StudentOnlyGuard>
                <SavedPGs />
              </StudentOnlyGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <StudentOnlyGuard>
                <Dashboard />
              </StudentOnlyGuard>
            }
          />

          {/* Common Authenticated Notifications */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['student', 'user', 'owner', 'admin']}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Owner Silo (Strictly Approved Owners) */}
          <Route
            path="/owner"
            element={
              <OwnerRoute>
                <OwnerDashboard />
              </OwnerRoute>
            }
          />
          <Route
            path="/owner/add"
            element={
              <OwnerRoute>
                <AddPG />
              </OwnerRoute>
            }
          />
          <Route
            path="/owner/edit/:id"
            element={
              <OwnerRoute>
                <EditPG />
              </OwnerRoute>
            }
          />

          {/* Protected — Admin Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="pending" element={<AdminPending />} />
            <Route path="pgs" element={<AdminAllPGs />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </>
  );
}
