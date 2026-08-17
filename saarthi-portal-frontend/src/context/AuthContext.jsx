import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const isAdmin = localStorage.getItem('isAdmin') === 'true' || !!localStorage.getItem('adminToken');
    
    let role = 'job_seeker';
    if (isAdmin) {
      role = 'admin';
    } else if (department || employee_id) {
      role = 'employee';
    }

    const userData = {
      id: id || 'user_' + Date.now(),
      name,
      email,
      role,
      department,
      employee_id,
      is_admin: isAdmin,
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
    
    // Normalize user object
    const normalizedUser = {
      id: authData.id || authData.user?.id || authData.userId || 'user_' + Date.now(),
      name: authData.name || authData.user?.name || authData.userName || authData.email?.split('@')[0] || 'User',
      email: authData.email || authData.user?.email || authData.userEmail || '',
      role: (authData.role || authData.user?.role || (authData.is_admin ? 'admin' : (authData.department ? 'employee' : 'job_seeker'))).toLowerCase(),
      department: authData.department || authData.user?.department || '',
      employee_id: authData.employee_id || authData.employeeId || '',
      is_admin: Boolean(authData.is_admin || authData.role === 'admin' || authData.adminToken),
      can_create_admins: Boolean(authData.can_create_admins),
    };

    // Store in state
    setToken(jwtToken);
    setUser(normalizedUser);

    // Synchronize to localStorage across all legacy keys for 100% submodule compatibility
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('userId', normalizedUser.id);
    localStorage.setItem('userName', normalizedUser.name);
    localStorage.setItem('userEmail', normalizedUser.email);
    localStorage.setItem('userDept', normalizedUser.department);
    localStorage.setItem('employeeId', normalizedUser.employee_id);
    localStorage.setItem('isAdmin', normalizedUser.is_admin ? 'true' : 'false');
    
    if (normalizedUser.is_admin) {
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
      localStorage.setItem('user', JSON.stringify(updated));
      if (updates.name) localStorage.setItem('userName', updates.name);
      if (updates.email) localStorage.setItem('userEmail', updates.email);
      return updated;
    });
  };

  // Switch active role view (e.g. for Admin or multi-role testing)
  const switchRole = (newRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
    switchRole,
    isAdmin: user?.is_admin || user?.role === 'admin',
    isEmployer: user?.role === 'job_poster' || user?.role === 'employer' || user?.role === 'recruiter' || user?.role === 'poster',
    isSeeker: user?.role === 'job_seeker' || user?.role === 'seeker',
    isEmployee: user?.role === 'employee' || user?.role === 'iq_ops' || !!user?.department,
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
