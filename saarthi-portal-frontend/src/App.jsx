import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import UnifiedDashboard from './components/dashboard/UnifiedDashboard';
import Login from './Login';

const IqApp = lazy(() => import('./iq/IqApp'));
const JobsApp = lazy(() => import('./jobs/JobsApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-600 mt-3">Loading Saarthi Portal...</p>
              </div>
            }
          >
            <Routes>
              {/* Public Authentication */}
              <Route path="/login" element={<Login />} />

              {/* Unified Application Shell - All authenticated pages render inside AppLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Default landing is directly the Unified Dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<UnifiedDashboard />} />
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />

                {/* Saarthi IQ Module */}
                <Route path="/iq/*" element={<IqApp />} />

                {/* Recruitment & Jobs Module */}
                <Route path="/jobs/*" element={<JobsApp />} />

                {/* Administration Module */}
                <Route path="/admin/*" element={<AdminApp />} />
              </Route>

              {/* Wildcard Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;