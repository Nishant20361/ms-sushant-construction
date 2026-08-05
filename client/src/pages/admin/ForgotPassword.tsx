import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import { Spinner } from "../../components/Loading";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.forgotPassword(email.trim());
      setSuccessMessage(res.message);
      setEmail("");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Request failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
              M
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Forgot Password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your admin email to receive a reset link.
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
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Admin Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@example.com"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full !py-3">
                {submitting ? <Spinner className="h-5 w-5 text-white" /> : "Send Reset Link"}
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

