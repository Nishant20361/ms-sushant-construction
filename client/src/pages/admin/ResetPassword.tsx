import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import { Spinner } from "../../components/Loading";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (!newPassword || newPassword.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.resetPassword(token, newPassword);
      setSuccessMessage(res.message);
      setTimeout(() => navigate("/admin/login"), 3000);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Password reset failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">Invalid Reset Link</h1>
            <p className="mt-2 text-sm text-slate-500">
              This reset link is invalid or has expired.
            </p>
            <p className="mt-4 text-sm">
              <Link to="/admin/forgot-password" className="text-brand-600 hover:underline">
                Request a new reset link
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
              M
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Reset Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your new password (minimum 12 characters).
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {successMessage}
              <p className="mt-1 text-xs text-green-600">
                Redirecting to login page…
              </p>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  placeholder="At least 12 characters"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full !py-3">
                {submitting ? <Spinner className="h-5 w-5 text-white" /> : "Submit"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm">
            <Link to="/admin/login" className="text-brand-600 hover:underline">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

