import { adminApiClient } from "@/services/api/client";
import { normalizeDashboardOverview, normalizeNotificationSummary } from "./normalize";
export const dashboardService = {
  async getOverview(signal?: AbortSignal) { return normalizeDashboardOverview(await adminApiClient.request<unknown>("/admin/dashboard", { signal })); },
  async getNotificationSummary(signal?: AbortSignal) { return normalizeNotificationSummary(await adminApiClient.request<unknown>("/admin/notifications?limit=1", { signal })); },
};
