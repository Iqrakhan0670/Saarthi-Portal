import { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AccessDenied from './components/auth/AccessDenied';
import AppLayout from './components/layout/AppLayout';
import UnifiedDashboard from './components/dashboard/UnifiedDashboard';

import Login from './Login';
import ForgotPassword from './ForgotPassword';

// IQ module removed from main shell to simplify routing and avoid legacy flows
// const IqApp = lazy(() => import('./iq/IqApp'));
const JobsApp = lazy(() => import('./jobs/JobsApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

/*
 * ---------------------------------------------------------
 * ROLE-BASED HOME REDIRECT
 * ---------------------------------------------------------
 * Evaluates authenticated backend session and redirects to
 * the designated landing dashboard for the verified role.
 */
function RoleBasedHomeRedirect() {
  const {
    loading,
    isAuthenticated,
    user,
    role,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 mt-3">
          Verifying session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  const currentRole = role || user.role;

  if (!currentRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  const normalizedRole = normalizeRole(currentRole);

  if (!normalizedRole) {
    console.error('RoleBasedHomeRedirect: invalid role configuration:', currentRole);
    return <Navigate to="/unauthorized" replace />;
  }

  const dashboard = getDefaultDashboard(normalizedRole);

  if (!dashboard) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Navigate
      to={dashboard}
      replace
    />
  );
}

/*
 * ---------------------------------------------------------
 * ROOT APPLICATION ROUTER
 * ---------------------------------------------------------
 */
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600 mt-3">
                  Loading Saarthi Portal...
                </p>
              </div>
            }
          >
            <Routes>
              {/* =====================================================
                  PUBLIC AUTHENTICATION ROUTES
                 ===================================================== */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* =====================================================
                  ACCESS CONTROL FALLBACK (403 FORBIDDEN)
                 ===================================================== */}
              <Route path="/unauthorized" element={<AccessDenied />} />

              {/* =====================================================
                  PROTECTED APPLICATION SHELL
                 ===================================================== */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* ROOT RESOLVER */}
                <Route path="/" element={<RoleBasedHomeRedirect />} />
                <Route path="/home" element={<RoleBasedHomeRedirect />} />

                {/* UNIFIED DASHBOARD */}
                <Route path="/dashboard" element={<UnifiedDashboard />} />

                {/* JOBS / RECRUITMENT WORKSPACE */}
                <Route
                  path="/jobs/*"
                  element={<JobsApp />}
                />

                {/* ADMIN OPERATIONS WORKSPACE (ROLE-GATED) */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminApp />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* =====================================================
                  WILDCARD ROUTE - SAFE REDIRECT
                 ===================================================== */}
              <Route path="*" element={<RoleBasedHomeRedirect />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;