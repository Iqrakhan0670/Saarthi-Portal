import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  hasRouteAccess,
  getDefaultDashboard,
  normalizeRole,
} from '../../config/rbac';

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  allowedRoles = [],
}) {
  const {
    isAuthenticated,
    loading,
    user,
    role,
  } = useAuth();

  const location = useLocation();

  // ---------------------------------------------------------
  // 1. WAIT FOR AUTHENTICATION
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />

          <p className="text-sm font-medium text-gray-500">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 2. AUTHENTICATION CHECK
  // ---------------------------------------------------------
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // ---------------------------------------------------------
  // 3. GET ROLE FROM AUTH CONTEXT
  // ---------------------------------------------------------
  const currentRole = role || user.role;

  if (!currentRole) {
    console.error(
      'ProtectedRoute: authenticated user has no valid role.'
    );

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>

          <p className="text-sm text-gray-500 mb-5">
            Your account does not have a valid role assigned.
            Please contact the administrator.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 4. NORMALIZE ROLE
  // ---------------------------------------------------------
  const normalizedRole = normalizeRole(currentRole);

  if (!normalizedRole) {
    console.error(
      'ProtectedRoute: invalid user role:',
      currentRole
    );

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>

          <p className="text-sm text-gray-500">
            Your account has an invalid role configuration.
            Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 5. EXPLICIT ROLE RESTRICTION
  // ---------------------------------------------------------
  const routeRoles =
    allowedRoles.length > 0
      ? allowedRoles
      : requiredRoles;

  if (routeRoles.length > 0) {
    const normalizedAllowedRoles = routeRoles
      .map((routeRole) => normalizeRole(routeRole))
      .filter(Boolean);

    const hasRequiredRole =
      normalizedAllowedRoles.includes(normalizedRole);

    if (!hasRequiredRole) {
      console.warn(
        'ProtectedRoute: unauthorized role access attempt.',
        {
          role: normalizedRole,
          attemptedPath: location.pathname,
        }
      );

      const targetDashboard =
        getDefaultDashboard(normalizedRole);

      if (!targetDashboard) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Access Denied
              </h1>

              <p className="text-sm text-gray-500">
                You do not have permission to access this page.
              </p>
            </div>
          </div>
        );
      }

      return (
        <Navigate
          to={targetDashboard}
          replace
          state={{
            accessDenied: true,
            attemptedPath: location.pathname,
          }}
        />
      );
    }
  }

  // ---------------------------------------------------------
  // 6. URL-LEVEL RBAC CHECK
  // ---------------------------------------------------------
  const isRouteAllowed = hasRouteAccess(
    normalizedRole,
    location.pathname
  );

  if (!isRouteAllowed) {
    console.warn(
      'ProtectedRoute: unauthorized route access attempt.',
      {
        role: normalizedRole,
        attemptedPath: location.pathname,
      }
    );

    const targetDashboard =
      getDefaultDashboard(normalizedRole);

    if (!targetDashboard) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h1>

            <p className="text-sm text-gray-500">
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return (
      <Navigate
        to={targetDashboard}
        replace
        state={{
          accessDenied: true,
          attemptedPath: location.pathname,
        }}
      />
    );
  }

  // ---------------------------------------------------------
  // 7. AUTHENTICATED + AUTHORIZED
  // ---------------------------------------------------------
  return children;
}