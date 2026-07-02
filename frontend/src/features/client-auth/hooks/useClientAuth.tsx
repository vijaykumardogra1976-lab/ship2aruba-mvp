import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { setTokens, setOnUnauthorized } from "@/lib/axios";
import { fetchClientMe } from "../api/clientAuthApi";
import type { ClientUser } from "../types";

const CLIENT_ACCESS_KEY = "client_access_token";
const CLIENT_REFRESH_KEY = "client_refresh_token";

interface ClientAuthState {
  user: ClientUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthState | null>(null);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(CLIENT_ACCESS_KEY);
    localStorage.removeItem(CLIENT_REFRESH_KEY);
    setTokens(null, null);
    setUser(null);
  }, []);

  const loginWithTokens = useCallback(
    async (access: string, refresh: string) => {
      localStorage.setItem(CLIENT_ACCESS_KEY, access);
      localStorage.setItem(CLIENT_REFRESH_KEY, refresh);
      setTokens(access, refresh);
      const me = await fetchClientMe();
      setUser(me);
    },
    []
  );

  // Bootstrap: restore tokens from localStorage
  useEffect(() => {
    const access = localStorage.getItem(CLIENT_ACCESS_KEY);
    const refresh = localStorage.getItem(CLIENT_REFRESH_KEY);
    if (access && refresh) {
      setTokens(access, refresh);
      setOnUnauthorized(logout);
      fetchClientMe()
        .then(setUser)
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      loginWithTokens,
      logout,
    }),
    [user, isLoading, loginWithTokens, logout]
  );

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth(): ClientAuthState {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}
