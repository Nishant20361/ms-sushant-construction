import { describe, expect, it } from "vitest";
import { normalizeDashboardOverview, normalizeNotificationSummary, normalizeOrderStatus } from "./normalize";
import { greetingForHour, orderStatusPresentation, updatedLabel } from "./presentation";
import { shouldRetryDashboard } from "./queryPolicy";
import { AdminAppError } from "@/types/errors";

describe("Dashboard API normalization", () => {
  it("normalizes decimal strings, null amounts, negative counts, and missing arrays safely", () => {
    const result = normalizeDashboardOverview({ stats: { totalRevenue: "12345.50", totalDue: null, pendingOrders: -4 } });
    expect(result.stats.totalRevenue).toBe(12345.5);
    expect(result.stats.totalDue).toBe(0);
    expect(result.stats.pendingOrders).toBe(0);
    expect(result.recentOrders).toEqual([]);
  });
  it("caps bounded previews and supplies safe missing presentation text", () => {
    const result = normalizeDashboardOverview({ recentOrders: Array.from({ length: 8 }, (_, id) => ({ id, status: "NEW_STATUS" })), lowStockProducts: Array.from({ length: 14 }, (_, id) => ({ id })) });
    expect(result.recentOrders).toHaveLength(5);
    expect(result.lowStockProducts).toHaveLength(10);
    expect(result.recentOrders[0]).toMatchObject({ orderNumber: "Order", customerName: "Customer not provided", status: "UNKNOWN", subtotal: 0 });
  });
  it("degrades unknown order statuses to a labeled neutral state", () => {
    expect(normalizeOrderStatus("UNEXPECTED")).toBe("UNKNOWN");
    expect(orderStatusPresentation("UNKNOWN")).toMatchObject({ label: "Unknown", tone: "neutral" });
  });
  it("normalizes unread count without fabricating a badge", () => {
    expect(normalizeNotificationSummary({ unreadCount: "7" }).unreadCount).toBe(7);
    expect(normalizeNotificationSummary({ unreadCount: null }).unreadCount).toBe(0);
  });
  it("uses stable greeting and coarse refresh labels without timers", () => {
    expect(greetingForHour(9)).toBe("Good morning");
    expect(greetingForHour(14)).toBe("Good afternoon");
    expect(greetingForHour(20)).toBe("Good evening");
    expect(updatedLabel(1_000_000, 1_060_000)).toBe("Updated 1 min ago");
  });
  it("retries transient reads once but never auth, access, or rate-limit failures", () => {
    expect(shouldRetryDashboard(0, new AdminAppError("network", "offline"))).toBe(true);
    expect(shouldRetryDashboard(1, new AdminAppError("server", "server"))).toBe(false);
    expect(shouldRetryDashboard(0, new AdminAppError("unauthorized", "auth"))).toBe(false);
    expect(shouldRetryDashboard(0, new AdminAppError("forbidden", "access"))).toBe(false);
    expect(shouldRetryDashboard(0, new AdminAppError("rate_limited", "later"))).toBe(false);
  });
});
