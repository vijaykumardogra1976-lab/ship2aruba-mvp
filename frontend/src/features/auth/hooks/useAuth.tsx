import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAccessToken,
  getRefreshToken,
  setOnUnauthorized,
  setTokens,
} from "@/lib/axios";
import * as authApi from "../api/authApi";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setTokens(null, null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(clearSession);
    const init = async () => {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setTokens(data.access, data.refresh);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      setUser,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
