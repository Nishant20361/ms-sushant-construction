export type KnownOrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export interface DashboardStats {
  totalProducts: number; activeProducts: number; totalOrders: number; pendingOrders: number; confirmedOrders: number;
  processingOrders: number; outForDeliveryOrders: number; deliveredOrders: number; cancelledOrders: number;
  totalRevenue: number; totalCollected: number; totalCashCollected: number; totalOnlineCollected: number;
  totalDue: number; lowStockCount: number; lowStockThreshold: number;
}
export interface DashboardOrder { id: number; orderNumber: string; customerName: string; subtotal: number; status: KnownOrderStatus | "UNKNOWN"; createdAt: string | null }
export interface LowStockProduct { id: number; name: string; stock: number; unit: string; imageUrl: string | null }
export interface DashboardOverview { stats: DashboardStats; recentOrders: DashboardOrder[]; lowStockProducts: LowStockProduct[] }
export interface NotificationSummary { unreadCount: number }
