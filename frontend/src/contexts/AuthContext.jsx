/**
 * AuthContext — manages authentication state.
 * JWT access token stored in memory (NOT localStorage).
 * Refresh token stored in sessionStorage (cleared on tab close).
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize: check if refresh token exists and restore session
  useEffect(() => {
    const restore = async () => {
      const refreshToken = sessionStorage.getItem('refresh_token');
      if (refreshToken) {
        // Pre-check JWT expiration to avoid a redundant 401 network call
        let isExpired = false;
        try {
          const parts = refreshToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              isExpired = true;
            }
          } else {
            isExpired = true;
          }
        } catch {
          isExpired = true;
        }

        if (isExpired) {
          clearAccessToken();
          sessionStorage.removeItem('refresh_token');
          setLoading(false);
          return;
        }

        try {
          // Call the refresh endpoint directly first to set the access token in memory
          const refreshRes = await authAPI.refresh(refreshToken);
          const newAccess = refreshRes.data.access;
          setAccessToken(newAccess);

          // Now fetch the profile with the token set
          const res = await authAPI.profile();
          setUser(res.data);
        } catch {
          // Session expired
          clearAccessToken();
          sessionStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access, refresh, user: userData } = res.data;
    
    // Store access token in memory (secure — no XSS exposure)
    setAccessToken(access);
    
    // Store refresh token in sessionStorage (cleared on tab close)
    sessionStorage.setItem('refresh_token', refresh);
    
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = sessionStorage.getItem('refresh_token');
      if (refresh) await authAPI.logout(refresh);
    } catch {
      // Proceed with logout even if API fails
    } finally {
      // Clear all state — full page redirect clears all cache
      clearAccessToken();
      sessionStorage.removeItem('refresh_token');
      setUser(null);
      window.location.href = '/login'; // Full redirect clears memory state
    }
  }, []);

  const value = { user, loading, login, logout, isAdmin: user?.role === 'admin' };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
