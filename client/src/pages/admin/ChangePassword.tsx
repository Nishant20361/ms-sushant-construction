import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi, ApiRequestError } from "../../lib/api";
import { useAdminAuth } from "./AdminAuthContext";
import { useToast } from "../../components/Toast";

export default function ChangePassword() {
  const { logout } = useAdminAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentPassword) return setFormError("Current password is required");
    if (!newPassword || newPassword.length < 12) return setFormError("New password must be at least 12 characters");
    if (newPassword !== confirmPassword) return setFormError("Passwords do not match");

    setSaving(true);
    try {
      await adminApi.changePassword(currentPassword, newPassword);
      success("Password changed successfully. Please sign in again.");
      await logout();
      navigate("/admin/login");
    } catch (e) {
      if (e instanceof ApiRequestError) setFormError(e.message);
      else setFormError("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
        <p className="mt-1 text-sm text-slate-500">Password must be at least 12 characters.</p>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
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
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Changing Password…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
