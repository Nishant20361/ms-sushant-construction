import { orderStatuses } from "@/constants/statuses";
import type { DashboardOrder } from "./types";
export function orderStatusPresentation(status: DashboardOrder["status"]) { return status === "UNKNOWN" ? { label: "Unknown", tone: "neutral" as const, icon: "help-circle-outline" as const } : { label: orderStatuses[status][0], tone: orderStatuses[status][1], icon: orderStatuses[status][2] }; }
export function greetingForHour(hour: number) { if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }
export function updatedLabel(updatedAt: number, now = Date.now()) { if (!updatedAt) return "Not updated yet"; const minutes = Math.max(0, Math.floor((now - updatedAt) / 60_000)); return minutes < 1 ? "Updated just now" : minutes === 1 ? "Updated 1 min ago" : `Updated ${minutes} min ago`; }
