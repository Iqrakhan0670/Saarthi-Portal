import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES, normalizeRole, getDefaultDashboard } from '../config/rbac';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to reconstruct user object from legacy storage keys
  const reconstructUserFromStorage = () => {
    const id = localStorage.getItem('userId');
    const name = localStorage.getItem('userName') || 'User';
    const email = localStorage.getItem('userEmail') || '';
    const department = localStorage.getItem('userDept') || localStorage.getItem('department') || '';
    const employee_id = localStorage.getItem('employeeId') || '';
    const storedRole = localStorage.getItem('userRole') || localStorage.getItem('role');
    const isAdmin = localStorage.getItem('isAdmin') === 'true' || !!localStorage.getItem('adminToken');
    
    let role = normalizeRole(storedRole);
    if (isAdmin && role !== ROLES.ADMIN) {
      role = ROLES.ADMIN;
    }

    const userData = {
      id: id || 'user_' + Date.now(),
      name,
      email,
      role,
      department,
      employee_id,
      is_admin: role === ROLES.ADMIN,
    };

    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  // Initialize and synchronize auth state from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('adminToken');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken) {
        setToken(storedToken);
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.role = normalizeRole(parsedUser.role);
            setUser(parsedUser);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
            setUser(reconstructUserFromStorage());
          }
        } else {
          setUser(reconstructUserFromStorage());
        }
      }
    } catch (err) {
      console.error('Error initializing auth state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Unified login handler
  const login = (authData) => {
    const jwtToken = authData.token || authData.access_token || 'token_' + Date.now();
    
    const rawRole = authData.role || authData.user?.role || (authData.is_admin ? ROLES.ADMIN : (authData.department ? ROLES.IQ_ANALYST : ROLES.JOB_SEEKER));
    const role = normalizeRole(rawRole);

    // Normalize user object
    const normalizedUser = {
      id: authData.id || authData.user?.id || authData.userId || 'user_' + Date.now(),
      name: authData.name || authData.user?.name || authData.userName || authData.email?.split('@')[0] || 'User',
      email: authData.email || authData.user?.email || authData.userEmail || '',
      role,
      department: authData.department || authData.user?.department || '',
      employee_id: authData.employee_id || authData.employeeId || '',
      is_admin: role === ROLES.ADMIN,
      can_create_admins: Boolean(authData.can_create_admins),
    };

    // Store in state
    setToken(jwtToken);
    setUser(normalizedUser);

    // Synchronize to localStorage across keys
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('userRole', normalizedUser.role);
    localStorage.setItem('userId', normalizedUser.id);
    localStorage.setItem('userName', normalizedUser.name);
    localStorage.setItem('userEmail', normalizedUser.email);
    localStorage.setItem('userDept', normalizedUser.department);
    localStorage.setItem('employeeId', normalizedUser.employee_id);
    localStorage.setItem('isAdmin', normalizedUser.role === ROLES.ADMIN ? 'true' : 'false');
    
    if (normalizedUser.role === ROLES.ADMIN) {
      localStorage.setItem('adminToken', jwtToken);
    }
  };

  // Unified logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userDept');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('department');
    localStorage.removeItem('isAdmin');
  };

  // Update user profile
  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.role) {
        updated.role = normalizeRole(updates.role);
      }
      localStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('userRole', updated.role);
      if (updates.name) localStorage.setItem('userName', updates.name);
      if (updates.email) localStorage.setItem('userEmail', updates.email);
      return updated;
    });
  };

  // Switch active role view
  const switchRole = (newRole) => {
    if (!user) return;
    const normalized = normalizeRole(newRole);
    const updated = { ...user, role: normalized };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    localStorage.setItem('userRole', normalized);
  };

  const activeRole = user ? normalizeRole(user.role) : ROLES.JOB_SEEKER;

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    role: activeRole,
    defaultDashboard: user ? getDefaultDashboard(activeRole) : '/login',
    login,
    logout,
    updateUser,
    switchRole,
    isAdmin: activeRole === ROLES.ADMIN,
    isRecruitment: activeRole === ROLES.RECRUITMENT,
    isBD: activeRole === ROLES.BD,
    isIQAnalyst: activeRole === ROLES.IQ_ANALYST,
    isEmployer: activeRole === ROLES.EMPLOYER,
    isSeeker: activeRole === ROLES.JOB_SEEKER,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
