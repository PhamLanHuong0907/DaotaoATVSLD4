import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole } from '@/types/enums';
import { authApi, type MeResponse } from '@/api/authApi';
import { setAuthToken, getAuthToken, setRefreshToken } from '@/api/client';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  employee_id: string;
  occupation: string;
  skill_level: number;
  department_id?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  register: (payload: {
    username: string;
    password: string;
    full_name: string;
    employee_id: string;
    department_id?: string;
    occupation?: string;
    skill_level?: number;
  }) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const USER_KEY = 'atvsld_user';

function toAuthUser(me: MeResponse): AuthUser {
  return {
    id: me.id,
    username: me.username,
    full_name: me.full_name,
    role: me.role,
    employee_id: me.employee_id,
    occupation: me.occupation || '',
    skill_level: me.skill_level,
    department_id: me.department_id,
  };
}

function loadUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as AuthUser) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(loadUser);
  const [token, setTokenState] = useState<string | null>(getAuthToken());

  const persistUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const setUser = useCallback(
    (u: AuthUser) => {
      persistUser(u);
    },
    [persistUser],
  );

  const login = useCallback(
    async (username: string, password: string, rememberMe = false) => {
      const res = await authApi.login(username, password);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      // Only persist refresh token when "remember me" is checked
      if (rememberMe && res.refresh_token) {
        setRefreshToken(res.refresh_token);
      } else {
        setRefreshToken(null);
      }
      const authUser = toAuthUser(res.user);
      persistUser(authUser);
      return authUser;
    },
    [persistUser],
  );

  const register = useCallback(
    async (payload: Parameters<AuthContextType['register']>[0]) => {
      const res = await authApi.register(payload);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
      const authUser = toAuthUser(res.user);
      persistUser(authUser);
      return authUser;
    },
    [persistUser],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setRefreshToken(null);
    setTokenState(null);
    persistUser(null);
  }, [persistUser]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        setUser,
        isAuthenticated: !!user && !!token,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
