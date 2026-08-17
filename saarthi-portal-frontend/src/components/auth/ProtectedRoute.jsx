import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth();
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

  // Role verification if specified
  if (requiredRoles.length > 0 && user) {
    const userRole = user.role?.toLowerCase() || '';
    const isAdmin = user.is_admin || userRole === 'admin';
    
    // Admins bypass role checks
    if (!isAdmin && !requiredRoles.map((r) => r.toLowerCase()).includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
