import type { DashboardOrder, DashboardOverview, DashboardStats, KnownOrderStatus, LowStockProduct, NotificationSummary } from "./types";
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const finite = (value: unknown, fallback = 0) => { const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN; return Number.isFinite(parsed) ? parsed : fallback; };
const nonNegative = (value: unknown) => Math.max(0, finite(value));
const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const id = (value: unknown) => Math.max(0, Math.trunc(finite(value)));
const knownStatuses = new Set<KnownOrderStatus>(["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);
export const normalizeOrderStatus = (value: unknown): DashboardOrder["status"] => typeof value === "string" && knownStatuses.has(value as KnownOrderStatus) ? value as KnownOrderStatus : "UNKNOWN";
const date = (value: unknown) => { if (typeof value !== "string") return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : value; };

function normalizeStats(value: unknown): DashboardStats { const v = record(value); return {
  totalProducts: nonNegative(v.totalProducts), activeProducts: nonNegative(v.activeProducts), totalOrders: nonNegative(v.totalOrders), pendingOrders: nonNegative(v.pendingOrders),
  confirmedOrders: nonNegative(v.confirmedOrders), processingOrders: nonNegative(v.processingOrders), outForDeliveryOrders: nonNegative(v.outForDeliveryOrders),
  deliveredOrders: nonNegative(v.deliveredOrders), cancelledOrders: nonNegative(v.cancelledOrders), totalRevenue: nonNegative(v.totalRevenue),
  totalCollected: nonNegative(v.totalCollected), totalCashCollected: nonNegative(v.totalCashCollected), totalOnlineCollected: nonNegative(v.totalOnlineCollected),
  totalDue: nonNegative(v.totalDue), lowStockCount: nonNegative(v.lowStockCount), lowStockThreshold: nonNegative(v.lowStockThreshold),
}; }
function normalizeOrder(value: unknown): DashboardOrder { const v = record(value); return { id: id(v.id), orderNumber: text(v.orderNumber, "Order"), customerName: text(v.customerName, "Customer not provided"), subtotal: nonNegative(v.subtotal), status: normalizeOrderStatus(v.status), createdAt: date(v.createdAt) }; }
function normalizeProduct(value: unknown): LowStockProduct { const v = record(value); return { id: id(v.id), name: text(v.name, "Unnamed product"), stock: nonNegative(v.stock), unit: text(v.unit, "unit"), imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : null }; }
export function normalizeDashboardOverview(value: unknown): DashboardOverview { const v = record(value); return { stats: normalizeStats(v.stats), recentOrders: Array.isArray(v.recentOrders) ? v.recentOrders.slice(0, 5).map(normalizeOrder) : [], lowStockProducts: Array.isArray(v.lowStockProducts) ? v.lowStockProducts.slice(0, 10).map(normalizeProduct) : [] }; }
export function normalizeNotificationSummary(value: unknown): NotificationSummary { return { unreadCount: nonNegative(record(value).unreadCount) }; }
