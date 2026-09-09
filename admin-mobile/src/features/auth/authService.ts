import { adminApiClient } from "@/services/api/client";
import { nativeCookieAuthTransport } from "@/services/api/cookieTransport";

export interface AdminProfile {
  id: number;
  username: string;
  email: string | null;
  role: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  twoFactorEnabled?: boolean;
}

export interface LoginResult {
  admin?: AdminProfile;
  require2FA?: boolean;
  tempToken?: string;
  maskedEmail?: string;
  message?: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface SessionsResponse {
  activeCount: number;
  maxAllowed: number;
  currentSessionId?: string;
  sessions: SessionInfo[];
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResult> {
    const response = await adminApiClient.request<LoginResult>("/admin/auth/login", {
      method: "POST",
      body: { username, password },
      suppressUnauthorizedEvent: true,
    });
    if (response.admin) {
      await nativeCookieAuthTransport.persistCookies();
    }
    return response;
  },

  async verify2FA(tempToken: string, otp: string): Promise<AdminProfile> {
    const response = await adminApiClient.request<{ admin: AdminProfile }>("/admin/auth/verify-2fa", {
      method: "POST",
      body: { tempToken, otp },
      suppressUnauthorizedEvent: true,
    });
    await nativeCookieAuthTransport.persistCookies();
    return response.admin;
  },

  async resend2FA(tempToken: string): Promise<{ success: boolean; message: string }> {
    return adminApiClient.request<{ success: boolean; message: string }>("/admin/auth/resend-2fa", {
      method: "POST",
      body: { tempToken },
      suppressUnauthorizedEvent: true,
    });
  },

  async me() {
    return (await adminApiClient.request<{ admin: AdminProfile | null }>("/admin/auth/me", { suppressUnauthorizedEvent: true })).admin;
  },

  async logout() {
    return adminApiClient.request<{ message: string }>("/admin/auth/logout", { method: "POST", suppressUnauthorizedEvent: true });
  },

  async forgotPassword(email: string) {
    return adminApiClient.request<{ message: string }>("/admin/auth/forgot-password", { method: "POST", body: { email }, suppressUnauthorizedEvent: true });
  },

  async resetPassword(token: string, newPassword: string) {
    return adminApiClient.request<{ message: string }>("/admin/auth/reset-password", { method: "POST", body: { token, newPassword }, suppressUnauthorizedEvent: true });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return adminApiClient.request<{ message: string }>("/admin/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
  },

  async getSessions(): Promise<SessionsResponse> {
    return adminApiClient.request<SessionsResponse>("/admin/auth/sessions");
  },

  async revokeSession(id: string): Promise<{ success: boolean; message: string }> {
    return adminApiClient.request<{ success: boolean; message: string }>(`/admin/auth/sessions/${id}`, { method: "DELETE" });
  },

  async toggle2FA(enabled: boolean, password?: string): Promise<{ success: boolean; twoFactorEnabled: boolean; message: string }> {
    return adminApiClient.request<{ success: boolean; twoFactorEnabled: boolean; message: string }>("/admin/auth/toggle-2fa", {
      method: "POST",
      body: { enabled, password },
    });
  },
};
