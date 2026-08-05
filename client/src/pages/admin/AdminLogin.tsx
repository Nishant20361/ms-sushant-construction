import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { ApiRequestError } from "../../lib/api";
import { Spinner } from "../../components/Loading";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Please enter both username and password");
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/admin");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
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
            <h1 className="mt-4 text-xl font-bold text-slate-900">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">M/S Sushant Construction</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full !py-3">
              {submitting ? <Spinner className="h-5 w-5 text-white" /> : "Sign In"}
            </button>
          </form>

          <p className="mt-3 text-center text-sm">
            <Link to="/admin/forgot-password" className="text-brand-600 hover:underline">
              Forgot Password?
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            <Link to="/" className="text-brand-600 hover:underline">← Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

