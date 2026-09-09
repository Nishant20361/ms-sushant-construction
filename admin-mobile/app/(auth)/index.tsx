import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { Button, Card, Input } from "@/components/ui";
import { AuthFrame } from "@/features/auth/AuthFrame";
import { PasswordField } from "@/features/auth/PasswordField";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authMessages";
import { authService } from "@/features/auth/authService";
import { AdminAppError } from "@/types/errors";
import { useTheme } from "@/theme";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function LoginScreen() {
  const t = useTheme();
  const auth = useAuth();
  const params = useLocalSearchParams<{ reset?: string }>();

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<React.ElementRef<typeof Input>>(null);

  // 10-Attempt Lockout Countdown state
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // 2FA state
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Cleanup on unmount
  useEffect(() => () => setPassword(""), []);

  // Lockout timer interval
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Resend OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (auth.status === "authenticated") return <Redirect href="/(admin)" />;

  const submitCredentials = async () => {
    if (loading || (lockoutSeconds !== null && lockoutSeconds > 0)) return;
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError(null);
    auth.clearNotice();
    try {
      const res = await auth.login(username.trim(), password);
      setPassword("");
      if (res.require2FA && res.tempToken) {
        setStep("2fa");
        setTempToken(res.tempToken);
        setMaskedEmail(res.maskedEmail || "your email");
        setResendCooldown(60);
      }
    } catch (cause) {
      if (cause instanceof AdminAppError) {
        if (cause.retryAfter && cause.retryAfter > 0) {
          setLockoutSeconds(cause.retryAfter);
        } else if (cause.lockedUntil) {
          const diff = Math.ceil((new Date(cause.lockedUntil).getTime() - Date.now()) / 1000);
          if (diff > 0) setLockoutSeconds(diff);
        }
      }
      setError(authErrorMessage(cause, "login"));
    } finally {
      setLoading(false);
    }
  };

  const submit2FA = async () => {
    if (loading || !tempToken) return;
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await auth.verify2FA(tempToken, otp.trim());
      setOtp("");
    } catch (cause) {
      setError(authErrorMessage(cause, "login"));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0 || !tempToken || resending) return;
    setResending(true);
    setError(null);
    try {
      await authService.resend2FA(tempToken);
      setResendCooldown(60);
      setError("New verification code sent to your email.");
    } catch (cause) {
      setError(authErrorMessage(cause, "login"));
    } finally {
      setResending(false);
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setTempToken(null);
    setOtp("");
    setError(null);
  };

  return (
    <Screen keyboardAware centered contentStyle={{ paddingVertical: t.spacing.md }}>
      <AuthFrame
        title={step === "2fa" ? "Two-Factor Verification" : "Admin sign in"}
        subtitle={
          step === "2fa"
            ? `Enter the 6-digit security code sent to ${maskedEmail || "your email"}.`
            : "Use your authorized Admin credentials to continue."
        }
      >
        {params.reset === "success" && (
          <AppText accessibilityRole="alert" style={{ color: t.colors.success }}>
            Password reset successfully. Sign in with your new password.
          </AppText>
        )}

        {/* 10-Attempt Lockout Countdown Alert Card */}
        {lockoutSeconds !== null && lockoutSeconds > 0 && (
          <Card
            style={{
              backgroundColor: t.colors.dangerSoft,
              borderColor: t.colors.danger,
              borderWidth: 1.5,
              padding: t.spacing.md,
              alignItems: "center",
              gap: 6,
            }}
          >
            <AppText role="cardTitle" style={{ color: t.colors.danger, fontWeight: "bold" }}>
              ⏱️ Account Temporarily Locked
            </AppText>
            <AppText role="body" style={{ color: t.colors.text, textAlign: "center", fontSize: 13 }}>
              Too many incorrect password attempts (10+). Sign-in is locked to protect your account.
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <AppText role="caption" style={{ color: t.colors.textSecondary }}>
                Try again in:
              </AppText>
              <AppText
                role="sectionTitle"
                style={{
                  color: t.colors.danger,
                  fontSize: 22,
                  fontWeight: "bold",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatTimer(lockoutSeconds)}
              </AppText>
            </View>
          </Card>
        )}

        {(auth.notice || error) && (
          <AppText
            accessibilityRole="alert"
            style={{
              color: error?.includes("sent") ? t.colors.success : error ? t.colors.danger : t.colors.warning,
            }}
          >
            {error || auth.notice}
          </AppText>
        )}

        {step === "credentials" ? (
          <>
            <Input
              label="Username"
              required
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              returnKeyType="next"
              value={username}
              disabled={lockoutSeconds !== null && lockoutSeconds > 0}
              onChangeText={setUsername}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder="Enter username"
            />
            <PasswordField
              ref={passwordRef}
              label="Password"
              required
              accessibilityLabel="Password"
              returnKeyType="done"
              disabled={lockoutSeconds !== null && lockoutSeconds > 0}
              onSubmitEditing={() => void submitCredentials()}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
            />
            <Button
              title={
                lockoutSeconds !== null && lockoutSeconds > 0
                  ? `Locked (${formatTimer(lockoutSeconds)})`
                  : "Sign In"
              }
              loading={loading}
              disabled={loading || (lockoutSeconds !== null && lockoutSeconds > 0)}
              onPress={() => void submitCredentials()}
            />
            <Button
              title="Forgot Password"
              variant="ghost"
              disabled={lockoutSeconds !== null && lockoutSeconds > 0}
              onPress={() => router.push("/(auth)/forgot-password" as never)}
            />
            <AppText
              role="caption"
              style={{ color: t.colors.textMuted, textAlign: "center" }}
            >
              Protected by secure multi-device session management (max 6 active phones).
            </AppText>
          </>
        ) : (
          /* 2FA OTP Step */
          <>
            <Input
              label="6-Digit Verification Code"
              required
              accessibilityLabel="6-Digit Verification Code"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void submit2FA()}
              value={otp}
              onChangeText={setOtp}
              placeholder="123456"
            />
            <Button
              title="Verify & Sign In"
              loading={loading}
              disabled={loading || otp.trim().length !== 6}
              onPress={() => void submit2FA()}
            />
            <Button
              title={resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
              variant="outline"
              loading={resending}
              disabled={resending || resendCooldown > 0}
              onPress={() => void resendOtp()}
            />
            <Button
              title="← Back to Login"
              variant="ghost"
              onPress={backToCredentials}
            />
          </>
        )}
      </AuthFrame>
    </Screen>
  );
}
