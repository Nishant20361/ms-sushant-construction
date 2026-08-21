import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { queryClient } from "@/services/query/queryClient";
import { setUnauthorizedHandler } from "@/services/api/client";
import { nativeCookieAuthTransport } from "@/services/api/cookieTransport";
import { AdminAppError } from "@/types/errors";
import { authService, type AdminProfile } from "./authService";
import {pushService} from "@/features/push/pushService";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";
interface AuthValue {
  status: AuthStatus; admin: AdminProfile | null; notice: string | null; startupOffline: boolean;
  login(username: string, password: string): Promise<void>; logout(): Promise<void>; changePassword(currentPassword: string, newPassword: string): Promise<void>; clearNotice(): void; refreshSession(): Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
const FOREGROUND_RECHECK_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("unknown");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [startupOffline, setStartupOffline] = useState(false);
  const lastVerifiedAt = useRef(0);
  const checking = useRef<Promise<void> | null>(null);
  const startupStarted = useRef(false);

  const invalidateSession = useCallback(async (message = "Session expired. Please sign in again.") => {
    setAdmin(null); setStatus("unauthenticated"); setNotice(message); queryClient.clear();
    await nativeCookieAuthTransport.clear().catch(() => undefined);
  }, []);

  const refreshSession = useCallback(async () => {
    if (checking.current) return checking.current;
    const task = (async () => {
      try {
        const profile = await authService.me();
        if (!profile) { await invalidateSession(); return; }
        setAdmin(profile); setStatus("authenticated"); setStartupOffline(false); lastVerifiedAt.current = Date.now();
      } catch (error) {
        if (error instanceof AdminAppError && error.kind === "unauthorized") await invalidateSession();
        else if (status === "unknown") { setStartupOffline(true); setStatus("unauthenticated"); setNotice("You're offline. Connect to the internet to continue."); }
      }
    })().finally(() => { checking.current = null; });
    checking.current = task;
    return task;
  }, [invalidateSession, status]);

  useEffect(() => { if (!startupStarted.current) { startupStarted.current = true; void refreshSession(); } }, [refreshSession]);
  useEffect(() => { setUnauthorizedHandler(() => { void invalidateSession(); }); return () => setUnauthorizedHandler(null); }, [invalidateSession]);
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === "active" && status === "authenticated" && Date.now() - lastVerifiedAt.current >= FOREGROUND_RECHECK_MS) void refreshSession();
    };
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, [refreshSession, status]);

  const login = useCallback(async (username: string, password: string) => {
    const profile = await authService.login(username, password);
    setAdmin(profile); setStatus("authenticated"); setNotice(null); setStartupOffline(false); lastVerifiedAt.current = Date.now();
  }, []);
  const logout = useCallback(async () => {
    await pushService.unregister().catch(()=>undefined);
    try { await authService.logout(); } catch { /* Local logout always wins. */ }
    finally { setAdmin(null); setStatus("unauthenticated"); setNotice(null); queryClient.clear(); await nativeCookieAuthTransport.clear().catch(() => undefined); }
  }, []);
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await pushService.unregister().catch(()=>undefined);
    await authService.changePassword(currentPassword, newPassword);
    await invalidateSession("Password changed successfully. Please sign in again.");
  }, [invalidateSession]);
  const clearNotice = useCallback(() => setNotice(null), []);
  const value = useMemo(() => ({ status, admin, notice, startupOffline, login, logout, changePassword, clearNotice, refreshSession }), [status, admin, notice, startupOffline, login, logout, changePassword, clearNotice, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used within AuthProvider"); return value; }
