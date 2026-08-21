import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { darkColors, elevation, lightColors, radius, spacing, typography, type ThemeMode } from "./tokens";
const STORAGE_KEY = "sushant-control.theme-preference";
type ResolvedTheme = "light" | "dark";
const buildTheme = (resolved: ResolvedTheme) => ({ colors: resolved === "dark" ? darkColors : lightColors, spacing, radius, typography, elevation });
type ThemeValue = ReturnType<typeof buildTheme> & { preference: ThemeMode; resolved: ResolvedTheme; setPreference: (mode: ThemeMode) => void; ready: boolean };
const ThemeContext = createContext<ThemeValue | null>(null);
const isThemeMode = (value: unknown): value is ThemeMode => value === "light" || value === "dark" || value === "system";
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => { let active = true; AsyncStorage.getItem(STORAGE_KEY).then(value => { if (active && isThemeMode(value)) setPreferenceState(value); }).catch(() => undefined).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  const setPreference = useCallback((mode: ThemeMode) => { setPreferenceState(mode); void AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined); }, []);
  const resolved: ResolvedTheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const value = useMemo(() => ({ ...buildTheme(resolved), preference, resolved, setPreference, ready }), [preference, ready, resolved, setPreference]);
  return <ThemeContext.Provider value={value}><StatusBar style={resolved === "dark" ? "light" : "dark"} />{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error("useTheme must be used within ThemeProvider"); return value; }
