import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiObject, authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
        try {
          const response = await authAPI.getMe();
          const currentUser = apiObject(response.data, 'user');
          if (!currentUser.email && !currentUser.id) throw new Error('Invalid user payload');
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed?.email) setUser(parsed);
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      const { token, user: userData } = response.data;
      if (!token || !userData) throw new Error('Invalid login response');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const status = err.response?.status;
      const message = status === 401 || status === 400
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : err.response?.data?.error || err.response?.data?.message || '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const validationMessage = err.response?.data?.errors?.[0]?.msg;
      const message = err.response?.data?.error || err.response?.data?.message || validationMessage || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    setError(null);
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Profile update failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setError(null);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Password change failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    hasRole,
    isAdmin: () => user?.role === 'admin',
    isSuperAdmin: () => user?.role === 'admin',
    isInstructor: () => user?.role === 'instructor' || user?.role === 'admin',
    isHRManager: () => user?.role === 'hr_manager' || user?.role === 'admin',
  }), [user, loading, error, login, register, logout, updateProfile, changePassword, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
