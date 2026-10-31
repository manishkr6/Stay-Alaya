import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Loading Spinner shown while authenticating or validating user session
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-9 h-9 border-4 border-[#0f2547] border-t-[#f5a623] rounded-full animate-spin" />
    </div>
  );
}

/**
 * OwnerTrapGuard:
 * Restricts access to public and student routes (Home, Find PG, etc.).
 * If an owner visits, silos them strictly to their assigned screen:
 * - Unsubmitted form -> /list-your-pg
 * - Submitted but unapproved -> /owner/pending
 * - Approved -> /owner
 */
export function OwnerTrapGuard({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (currentUser?.role === 'owner') {
    if (!currentUser.owner_form_submitted) {
      return <Navigate to="/list-your-pg" replace />;
    }
    if (!currentUser.admin_approved) {
      return <Navigate to="/owner/pending" replace />;
    }
    return <Navigate to="/owner" replace />;
  }

  return children;
}

/**
 * OwnerRoute:
 * Protects Owner Dashboard and Listing Management routes (/owner, /owner/add, /owner/edit/:id).
 * Strictly requires role = 'owner' AND admin_approved = true (or admin).
 * Redirects unsubmitted/unapproved owners to their respective traps.
 */
export function OwnerRoute({ children }) {
  const { currentUser, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated || !currentUser || currentUser.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'admin') {
    return children;
  }

  if (currentUser.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  // Owner Trap checks
  if (!currentUser.owner_form_submitted) {
    return <Navigate to="/list-your-pg" replace />;
  }

  if (!currentUser.admin_approved) {
    return <Navigate to="/owner/pending" replace />;
  }

  return children;
}

/**
 * OwnerOnboardingGuard:
 * Guards /list-your-pg.
 * If an owner has already submitted their form and is pending -> /owner/pending
 * If an owner is already approved -> /owner
 * If an owner hasn't submitted yet -> allow access to form.
 * Guests and students can access to view or submit owner requests.
 */
export function OwnerOnboardingGuard({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (currentUser?.role === 'owner') {
    if (currentUser.owner_form_submitted && !currentUser.admin_approved) {
      return <Navigate to="/owner/pending" replace />;
    }
    if (currentUser.owner_form_submitted && currentUser.admin_approved) {
      return <Navigate to="/owner" replace />;
    }
  }

  return children;
}

/**
 * OwnerPendingGuard:
 * Guards /owner/pending.
 * Only allows owners who have submitted their onboarding form but are NOT yet admin-approved.
 */
export function OwnerPendingGuard({ children }) {
  const { currentUser, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated || !currentUser || currentUser.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'owner') {
    if (!currentUser.owner_form_submitted) {
      return <Navigate to="/list-your-pg" replace />;
    }
    if (currentUser.admin_approved) {
      return <Navigate to="/owner" replace />;
    }
    return children;
  }

  return <Navigate to="/" replace />;
}

/**
 * StudentOnlyGuard:
 * Protects student/tenant private areas (/saved-pgs, /dashboard).
 * Silos owners out to their appropriate owner view.
 */
export function StudentOnlyGuard({ children }) {
  const { currentUser, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated || !currentUser || currentUser.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (currentUser.role === 'owner') {
    if (!currentUser.owner_form_submitted) {
      return <Navigate to="/list-your-pg" replace />;
    }
    if (!currentUser.admin_approved) {
      return <Navigate to="/owner/pending" replace />;
    }
    return <Navigate to="/owner" replace />;
  }

  return children;
}

