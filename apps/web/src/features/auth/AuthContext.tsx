/**
 * AuthContext — JWT access + refresh, perfil, permissões e logout.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { apiRequest } from '@/services/apiClient';

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string;
  organizationName: string;
  roleName: string;
  permissions: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterOrgPayload {
  organizationName: string;
  slug: string;
  documentNumber: string;
  adminDisplayName: string;
  adminEmail: string;
  adminPassword: string;
}

interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  displayName: string;
  email: string;
  tenantId: string;
  organizationName: string;
  roleName: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  registerOrg: (payload: RegisterOrgPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

const TOKEN_KEY = 'lumini_auth_token';
const REFRESH_KEY = 'lumini_refresh_token';
const USER_KEY = 'lumini_auth_user';

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => parseStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const processLoginResponse = useCallback((response: LoginApiResponse) => {
    const authUser: AuthUser = {
      userId: response.userId,
      email: response.email,
      displayName: response.displayName,
      tenantId: response.tenantId,
      organizationName: response.organizationName,
      roleName: response.roleName,
      permissions: response.permissions,
    };
    setToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(authUser);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const { data } = await apiRequest<LoginApiResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      processLoginResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, [processLoginResponse]);

  const registerOrg = useCallback(async (payload: RegisterOrgPayload) => {
    setIsLoading(true);
    try {
      const { data } = await apiRequest<LoginApiResponse>('/auth/register-org', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      processLoginResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, [processLoginResponse]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // revogação best-effort
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [refreshToken]);

  const hasPermission = useCallback((permission: string) => {
    return user?.permissions.includes(permission) ?? false;
  }, [user]);

  const hasAnyPermission = useCallback((...permissions: string[]) => {
    return permissions.some((p) => user?.permissions.includes(p) ?? false);
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    registerOrg,
    logout,
    hasPermission,
    hasAnyPermission,
  }), [user, token, isLoading, login, registerOrg, logout, hasPermission, hasAnyPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de <AuthProvider>');
  }
  return ctx;
}
