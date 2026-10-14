import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import { ProtectedRoute } from './components/shared/index.jsx';

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
import ListYourPG from './pages/ListYourPG.jsx';
import Notifications from './pages/Notifications.jsx';
import SavedPGs from './pages/SavedPGs.jsx';
import TermsOfService from './pages/LegalTerms.jsx';
import PrivacyPolicy from './pages/LegalPrivacy.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AlayaAIAssistant from './components/ai/AlayaAIAssistant.jsx';

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx';
import AddPG from './pages/owner/AddPG.jsx';
import EditPG from './pages/owner/EditPG.jsx';

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
const AUTH_PATHS = ['/login', '/signup', '/verify-otp', '/forgot-password', '/reset-password'];

function AppLayout({ children }) {
  const { pathname } = useLocation();
  const isAdmin = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));

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
      {!isAuth && <Footer />}
      <AlayaAIAssistant />
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
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/find-pg" element={<FindPG />} />
          <Route path="/about" element={<About />} />
          <Route path="/pg/:id" element={<PGDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/list-your-pg" element={<ListYourPG />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['user', 'owner', 'admin']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved-pgs"
            element={
              <ProtectedRoute allowedRoles={['user', 'owner', 'admin']}>
                <SavedPGs />
              </ProtectedRoute>
            }
          />

          {/* Protected — any logged-in user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['user', 'owner', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected — owner */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/add"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <AddPG />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <EditPG />
              </ProtectedRoute>
            }
          />

          {/* Protected — admin */}
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

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </>
  );
}
