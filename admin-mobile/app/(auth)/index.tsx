import { useEffect, useRef, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { Button, Input } from "@/components/ui";
import { AuthFrame } from "@/features/auth/AuthFrame";
import { PasswordField } from "@/features/auth/PasswordField";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authMessages";
import { useTheme } from "@/theme";
export default function LoginScreen() {
  const t = useTheme(); const auth = useAuth(); const params = useLocalSearchParams<{ reset?: string }>(); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const passwordRef = useRef<React.ElementRef<typeof Input>>(null);
  useEffect(() => () => setPassword(""), []);
  if (auth.status === "authenticated") return <Redirect href="/(admin)" />;
  const submit = async () => { if (loading) return; if (!username.trim() || !password) { setError("Enter your username and password."); return; } setLoading(true); setError(null); auth.clearNotice(); try { await auth.login(username.trim(), password); setPassword(""); } catch (cause) { setError(authErrorMessage(cause, "login")); } finally { setLoading(false); } };
  return <Screen keyboardAware centered contentStyle={{ paddingVertical: t.spacing.xxl }}><AuthFrame title="Admin sign in" subtitle="Use your authorized Admin credentials to continue.">{params.reset === "success" && <AppText accessibilityRole="alert" style={{ color: t.colors.success }}>Password reset successfully. Sign in with your new password.</AppText>}{(auth.notice || error) && <AppText accessibilityRole="alert" style={{ color: error ? t.colors.danger : t.colors.warning }}>{error || auth.notice}</AppText>}<Input label="Username" required accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" returnKeyType="next" value={username} onChangeText={setUsername} onSubmitEditing={() => passwordRef.current?.focus()} placeholder="Enter username" /><PasswordField ref={passwordRef} label="Password" required accessibilityLabel="Password" returnKeyType="done" onSubmitEditing={() => void submit()} value={password} onChangeText={setPassword} placeholder="Enter password" /><Button title="Sign In" loading={loading} disabled={loading} onPress={() => void submit()} /><Button title="Forgot Password" variant="ghost" onPress={() => router.push("/(auth)/forgot-password" as never)} /><AppText role="caption" style={{ color: t.colors.textMuted, textAlign: "center" }}>Protected by secure HttpOnly session cookies. Credentials are never stored.</AppText></AuthFrame></Screen>;
}
