import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { adminApi, ApiRequestError } from "../../lib/api";
import { Spinner } from "../../components/Loading";

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function AdminLogin() {
  const { login, verify2FA } = useAdminAuth();
  const navigate = useNavigate();

  // Credentials state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 10-attempt lockout countdown timer
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // 2FA state
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Lockout timer ticking
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds !== null && lockoutSeconds > 0) return;
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }
    setSubmitting(true);
    try {
      const res = await login(username.trim(), password);
      if (res.require2FA && res.tempToken) {
        setStep("2fa");
        setTempToken(res.tempToken);
        setMaskedEmail(res.maskedEmail || "your email");
        setResendCooldown(60);
      } else {
        navigate("/admin");
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.retryAfter && err.retryAfter > 0) {
          setLockoutSeconds(err.retryAfter);
        } else if (err.lockedUntil) {
          const diff = Math.ceil((new Date(err.lockedUntil).getTime() - Date.now()) / 1000);
          if (diff > 0) setLockoutSeconds(diff);
        }
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verify2FA(tempToken, otp.trim());
      navigate("/admin");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !tempToken || resending) return;
    setResending(true);
    setError(null);
    try {
      await adminApi.resend2FA(tempToken);
      setResendCooldown(60);
      setError("New verification code sent to your email.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again.");
      }
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
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-500/30">
              M
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {step === "2fa" ? "Two-Factor Authentication" : "Admin Login"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === "2fa"
                ? `Enter the 6-digit security code sent to ${maskedEmail || "your email"}.`
                : "M/S Sushant Construction"}
            </p>
          </div>

          {/* 10-Attempt Lockout Countdown Alert Card */}
          {lockoutSeconds !== null && lockoutSeconds > 0 && (
            <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-red-800">
                <span>⏱️</span>
                <span>Account Temporarily Locked</span>
              </div>
              <p className="mt-1 text-xs text-red-600">
                Too many failed password attempts (10+). Sign-in is locked for 15 minutes to protect your account.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 font-mono text-lg font-bold text-red-700">
                <span>Try again in:</span>
                <span>{formatTimer(lockoutSeconds)}</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
                error.includes("sent")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {error}
            </div>
          )}

          {step === "credentials" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={lockoutSeconds !== null && lockoutSeconds > 0}
                  autoFocus
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lockoutSeconds !== null && lockoutSeconds > 0}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || (lockoutSeconds !== null && lockoutSeconds > 0)}
                className="btn-primary w-full !py-3"
              >
                {submitting ? (
                  <Spinner className="h-5 w-5 text-white" />
                ) : lockoutSeconds !== null && lockoutSeconds > 0 ? (
                  `Locked (${formatTimer(lockoutSeconds)})`
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="label" htmlFor="otp">
                  6-Digit Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={submitting || otp.trim().length !== 6}
                className="btn-primary w-full !py-3"
              >
                {submitting ? <Spinner className="h-5 w-5 text-white" /> : "Verify & Sign In"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={backToCredentials}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ← Back to login
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending || resendCooldown > 0}
                  className={`text-brand-600 hover:underline ${
                    resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {resending
                    ? "Sending..."
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </button>
              </div>
            </form>
          )}

          {step === "credentials" && (
            <p className="mt-3 text-center text-sm">
              <Link to="/admin/forgot-password" className="text-brand-600 hover:underline">
                Forgot Password?
              </Link>
            </p>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            <Link to="/" className="text-brand-600 hover:underline">
              ← Back to website
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
