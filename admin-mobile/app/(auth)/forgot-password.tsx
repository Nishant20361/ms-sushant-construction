import { useState } from "react";
import { Redirect, router } from "expo-router";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { Button, Input } from "@/components/ui";
import { AuthFrame } from "@/features/auth/AuthFrame";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authMessages";
import { authService } from "@/features/auth/authService";
import { useTheme } from "@/theme";
const GENERIC_SUCCESS = "If an account matches, reset instructions have been sent.";
export default function ForgotPasswordScreen() { const t = useTheme(); const { status } = useAuth(); const [email, setEmail] = useState(""); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); if (status === "authenticated") return <Redirect href="/(admin)" />; const submit = async () => { if (loading) return; setLoading(true); setError(null); try { await authService.forgotPassword(email.trim()); setMessage(GENERIC_SUCCESS); } catch (cause) { setError(authErrorMessage(cause, "forgot")); } finally { setLoading(false); } }; return <Screen keyboardAware centered contentStyle={{ paddingVertical: t.spacing.xxl }}><AuthFrame title="Forgot password" subtitle="Enter the email associated with your Admin account.">{error && <AppText accessibilityRole="alert" style={{ color: t.colors.danger }}>{error}</AppText>}{message ? <><AppText accessibilityRole="alert" style={{ color: t.colors.success }}>{message}</AppText><Button title="Return to Sign In" onPress={() => router.replace("/(auth)")} /></> : <><Input label="Email" required accessibilityLabel="Admin email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" returnKeyType="send" value={email} onChangeText={setEmail} onSubmitEditing={() => void submit()} placeholder="admin@example.com" /><Button title="Send Reset Instructions" loading={loading} disabled={loading} onPress={() => void submit()} /><Button title="Back to Sign In" variant="ghost" onPress={() => router.back()} /></>}</AuthFrame></Screen>; }
