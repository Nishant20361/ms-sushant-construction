export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PAID", "PARTIALLY_PAID", "DUE"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export interface OrderItem { id: number; productId: number; productName: string; unit: string; price: number; quantity: number; total: number }
export interface OrderPayment { id: number; amount: number; paymentMode: "CASH" | "ONLINE" | "UNKNOWN"; paymentDate: string; notes: string | null }
export interface Order { id: number; orderNumber: string; customerName: string; customerMobile: string; deliveryAddress: string | null; notes: string | null; source?: string; subtotal: number; finalAmount: number; status: OrderStatus | "UNKNOWN"; items: OrderItem[]; payments: OrderPayment[]; cashTotal: number; onlineTotal: number; paidTotal: number; due: number; paymentStatus: PaymentStatus | "UNKNOWN"; createdAt: string; updatedAt: string }
export interface OrderFilters { search: string; status: OrderStatus | ""; paymentStatus: PaymentStatus | ""; from: string; to: string }
export interface OrdersPage { orders: Order[]; total: number; page: number; pages: number }
export interface ProductChoice { id: number; name: string; unit: string; price: number; mrp?: number; stock: number; isActive: boolean; categoryId?: number; categoryName?: string; imageUrl?: string | null; images?: { url: string; alt?: string | null }[] }
export interface CustomerLookupResult { found: boolean; customer: { name: string; mobile: string; address: string } | null; previousDue: number; ordersCount: number }
export interface AssistedOrderInput { customerName: string; customerMobile: string; deliveryAddress?: string; notes?: string; items: Array<{ productId: number; quantity: number }>; transportation?: number; discount?: number; paidAmount?: number; paymentMode?: "CASH" | "ONLINE"; clientRequestId?: string }
