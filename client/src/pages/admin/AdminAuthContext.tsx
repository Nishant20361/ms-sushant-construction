import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminApi, ApiRequestError, type AdminAuthUser, type LoginResponse } from "../../lib/api";

interface AdminAuthContextValue {
  user: AdminAuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  verify2FA: (tempToken: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .me()
      .then((res) => {
        if (res.admin) setUser(res.admin);
      })
      .catch((e) => {
        if (e instanceof ApiRequestError && e.status !== 401) {
          // non-auth errors: keep as unauthenticated, no need to surface
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await adminApi.login(username, password);
    if (res.admin) setUser(res.admin);
    return res;
  }, []);

  const verify2FA = useCallback(async (tempToken: string, otp: string) => {
    const res = await adminApi.verify2FA(tempToken, otp);
    setUser(res.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, verify2FA, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

