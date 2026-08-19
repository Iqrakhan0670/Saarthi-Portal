import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasRouteAccess, getDefaultDashboard } from '../../config/rbac';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, loading, user, role } = useAuth();
  const location = useLocation();

  // Check fallback token in localStorage if AuthContext is still initializing
  const hasToken = !!localStorage.getItem('token') || !!localStorage.getItem('adminToken');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Centralized RBAC Route Verification
  const currentRole = role || user?.role || 'job_seeker';
  const isAllowed = hasRouteAccess(currentRole, location.pathname);

  if (!isAllowed) {
    const targetDashboard = getDefaultDashboard(currentRole);
    return <Navigate to={targetDashboard} replace />;
  }

  // Explicit role verification if passed in props
  if (requiredRoles.length > 0 && user) {
    const isExplicitlyAllowed = requiredRoles.map((r) => r.toLowerCase()).includes(currentRole.toLowerCase());
    if (!isExplicitlyAllowed && currentRole !== 'admin') {
      return <Navigate to={getDefaultDashboard(currentRole)} replace />;
    }
  }

  return children;
}
