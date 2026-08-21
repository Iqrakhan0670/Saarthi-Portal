import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  ROLES,
  normalizeRole,
  getDefaultDashboard,
} from '../config/rbac';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Normalize user data received from the backend/login API.
   *
   * IMPORTANT:
   * The role must come from the authentication response.
   * We do NOT guess a role from department, isAdmin, etc.
   */
  const normalizeUser = useCallback((rawUser) => {
    if (!rawUser || typeof rawUser !== 'object') {
      return null;
    }

    const normalizedRole = normalizeRole(
      rawUser.role ||
        rawUser.userRole ||
        rawUser.user_role
    );

    return {
      id:
        rawUser.id ||
        rawUser.userId ||
        null,

      name:
        rawUser.name ||
        rawUser.userName ||
        rawUser.full_name ||
        rawUser.fullName ||
        rawUser.email?.split('@')[0] ||
        'User',

      email:
        rawUser.email ||
        rawUser.userEmail ||
        '',

      role: normalizedRole,

      department:
        rawUser.department ||
        rawUser.userDept ||
        '',

      employee_id:
        rawUser.employee_id ||
        rawUser.employeeId ||
        '',

      is_admin:
        normalizedRole === ROLES.ADMIN,

      can_create_admins:
        Boolean(rawUser.can_create_admins),
    };
  }, []);

  /**
   * Cache user information locally.
   *
   * IMPORTANT:
   * localStorage is only a cache.
   * It must NOT be treated as the source of authorization.
   */
  const cacheUser = useCallback((userData) => {
    if (!userData) return;

    try {
      localStorage.setItem(
        'user',
        JSON.stringify(userData)
      );

      if (userData.id) {
        localStorage.setItem(
          'userId',
          String(userData.id)
        );
      }

      if (userData.name) {
        localStorage.setItem(
          'userName',
          userData.name
        );
      }

      if (userData.email) {
        localStorage.setItem(
          'userEmail',
          userData.email
        );
      }

      if (userData.department) {
        localStorage.setItem(
          'userDept',
          userData.department
        );
      }

      if (userData.employee_id) {
        localStorage.setItem(
          'employeeId',
          userData.employee_id
        );
      }

      if (userData.role) {
        localStorage.setItem(
          'userRole',
          userData.role
        );
      } else {
        localStorage.removeItem('userRole');
      }

      localStorage.setItem(
        'isAdmin',
        userData.role === ROLES.ADMIN
          ? 'true'
          : 'false'
      );
    } catch (error) {
      console.error(
        'Failed to cache user information:',
        error
      );
    }
  }, []);

  /**
   * Clear all authentication-related localStorage.
   */
  const clearAuthStorage = useCallback(() => {
    const keys = [
      'token',
      'adminToken',
      'user',
      'userRole',
      'role',
      'userId',
      'userName',
      'userEmail',
      'userDept',
      'department',
      'employeeId',
      'isAdmin',
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  }, []);

  /**
   * Restore existing authentication session.
   *
   * We do NOT reconstruct a user from individual localStorage
   * values such as userRole or isAdmin.
   *
   * If the cached user does not contain a valid role,
   * authentication is cleared.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const storedToken =
          localStorage.getItem('token');

        const storedUser =
          localStorage.getItem('user');

        if (!storedToken) {
          if (mounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        if (!storedUser) {
          console.warn(
            'Token exists but authenticated user data is missing.'
          );

          clearAuthStorage();

          if (mounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        let parsedUser;

        try {
          parsedUser = JSON.parse(storedUser);
        } catch (error) {
          console.error(
            'Invalid stored user data:',
            error
          );

          clearAuthStorage();

          if (mounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        const normalizedUser =
          normalizeUser(parsedUser);

        /**
         * Never assign a default role.
         *
         * Missing/invalid role = unauthorized.
         */
        if (
          !normalizedUser ||
          !normalizedUser.id ||
          !normalizedUser.role
        ) {
          console.warn(
            'User has an invalid or missing role.'
          );

          clearAuthStorage();

          if (mounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        if (mounted) {
          setToken(storedToken);
          setUser(normalizedUser);
        }
      } catch (error) {
        console.error(
          'Error initializing authentication:',
          error
        );

        clearAuthStorage();

        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [clearAuthStorage, normalizeUser]);

  /**
   * Login
   *
   * Expected backend response can contain:
   *
   * {
   *   token: "...",
   *   role: "admin",
   *   user: {...}
   * }
   *
   * OR:
   *
   * {
   *   access_token: "...",
   *   user: {
   *     role: "job_seeker"
   *   }
   * }
   */
  const login = useCallback(
    (authData) => {
      if (!authData || typeof authData !== 'object') {
        throw new Error(
          'Invalid authentication response.'
        );
      }

      const jwtToken =
        authData.token ||
        authData.access_token ||
        authData.user?.token ||
        null;

      if (!jwtToken) {
        throw new Error(
          'Authentication token is missing.'
        );
      }

      /**
       * IMPORTANT:
       * Role must be supplied by the backend/auth response.
       *
       * DO NOT use:
       * is_admin -> admin
       * department -> iq_analyst
       * missing role -> job_seeker
       */
      const rawRole =
        authData.role ||
        authData.user?.role ||
        authData.user?.userRole ||
        authData.user?.user_role ||
        null;

      const normalizedRole =
        normalizeRole(rawRole);

      /**
       * Invalid role = reject login.
       */
      if (!normalizedRole) {
        console.error(
          'Login rejected: invalid or missing role.'
        );

        throw new Error(
          'Your account does not have a valid role. Please contact the administrator.'
        );
      }

      const rawUser =
        authData.user ||
        authData;

      const normalizedUser =
        normalizeUser({
          ...rawUser,

          id:
            authData.id ||
            authData.userId ||
            authData.user?.id,

          name:
            authData.name ||
            authData.userName ||
            authData.user?.name,

          email:
            authData.email ||
            authData.userEmail ||
            authData.user?.email,

          role: normalizedRole,

          department:
            authData.department ||
            authData.user?.department,

          employee_id:
            authData.employee_id ||
            authData.employeeId ||
            authData.user?.employee_id,

          can_create_admins:
            authData.can_create_admins ||
            authData.user?.can_create_admins,
        });

      if (
        !normalizedUser ||
        !normalizedUser.id ||
        !normalizedUser.role
      ) {
        throw new Error(
          'Unable to create authenticated user.'
        );
      }

      /**
       * Update React authentication state.
       */
      setToken(jwtToken);
      setUser(normalizedUser);

      /**
       * Store session/cache.
       *
       * ProtectedRoute must NOT use these values as the
       * trusted authorization source.
       */
      localStorage.setItem(
        'token',
        jwtToken
      );

      cacheUser(normalizedUser);

      /**
       * Compatibility with existing Admin code.
       */
      if (normalizedRole === ROLES.ADMIN) {
        localStorage.setItem(
          'adminToken',
          jwtToken
        );
      } else {
        localStorage.removeItem(
          'adminToken'
        );
      }

      return normalizedUser;
    },
    [cacheUser, normalizeUser]
  );

  /**
   * Logout
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);

    clearAuthStorage();
  }, [clearAuthStorage]);

  /**
   * Update profile information.
   *
   * SECURITY:
   * Role cannot be changed from the frontend.
   */
  const updateUser = useCallback(
    (updates) => {
      if (
        !updates ||
        typeof updates !== 'object'
      ) {
        return;
      }

      setUser((previousUser) => {
        if (!previousUser) {
          return previousUser;
        }

        const safeUpdates = {
          ...updates,
        };

        /**
         * Never allow frontend role modification.
         */
        delete safeUpdates.role;
        delete safeUpdates.userRole;
        delete safeUpdates.user_role;
        delete safeUpdates.is_admin;

        const updatedUser = {
          ...previousUser,
          ...safeUpdates,

          role: previousUser.role,

          is_admin:
            previousUser.role === ROLES.ADMIN,
        };

        cacheUser(updatedUser);

        return updatedUser;
      });
    },
    [cacheUser]
  );

  /**
   * Role switching is intentionally disabled.
   *
   * A user's role must be controlled by the backend.
   */
  const switchRole = useCallback(() => {
    console.warn(
      'Role switching is disabled. Roles must be managed by the backend.'
    );

    return false;
  }, []);

  /**
   * Current valid role.
   *
   * IMPORTANT:
   * No fallback to JOB_SEEKER.
   */
  const activeRole = user
    ? normalizeRole(user.role)
    : null;

  /**
   * User is authenticated only if:
   *
   * 1. Token exists
   * 2. User exists
   * 3. User has a valid role
   */
  const isAuthenticated =
    Boolean(token) &&
    Boolean(user) &&
    Boolean(activeRole);

  const defaultDashboard =
    activeRole
      ? getDefaultDashboard(activeRole)
      : '/login';

  const value = {
    user,

    token,

    loading,

    isAuthenticated,

    role: activeRole,

    defaultDashboard,

    login,

    logout,

    updateUser,

    /**
     * Kept for compatibility with existing components.
     * It DOES NOT change the user's role.
     */
    switchRole,

    isAdmin:
      activeRole === ROLES.ADMIN,

    isRecruitment:
      activeRole === ROLES.RECRUITMENT,

    isBD:
      activeRole === ROLES.BD,

    isIQAnalyst:
      activeRole === ROLES.IQ_ANALYST,

    isEmployer:
      activeRole === ROLES.EMPLOYER,

    isSeeker:
      activeRole === ROLES.JOB_SEEKER,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

export default AuthContext;