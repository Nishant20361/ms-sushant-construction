import { adminApiClient } from "@/services/api/client";
import { nativeCookieAuthTransport } from "@/services/api/cookieTransport";

export interface AdminProfile { id: number; username: string; email: string | null; role: string; lastLoginAt?: string | null; createdAt?: string }
export const authService = {
  async login(username: string, password: string) {
    const response = await adminApiClient.request<{ admin: AdminProfile }>("/admin/auth/login", { method: "POST", body: { username, password }, suppressUnauthorizedEvent: true });
    await nativeCookieAuthTransport.persistCookies();
    return response.admin;
  },
  async me() { return (await adminApiClient.request<{ admin: AdminProfile | null }>("/admin/auth/me", { suppressUnauthorizedEvent: true })).admin; },
  async logout() { return adminApiClient.request<{ message: string }>("/admin/auth/logout", { method: "POST", suppressUnauthorizedEvent: true }); },
  async forgotPassword(email: string) { return adminApiClient.request<{ message: string }>("/admin/auth/forgot-password", { method: "POST", body: { email }, suppressUnauthorizedEvent: true }); },
  async resetPassword(token: string, newPassword: string) { return adminApiClient.request<{ message: string }>("/admin/auth/reset-password", { method: "POST", body: { token, newPassword }, suppressUnauthorizedEvent: true }); },
  async changePassword(currentPassword: string, newPassword: string) { return adminApiClient.request<{ message: string }>("/admin/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }); },
};
