export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PAID", "PARTIALLY_PAID", "DUE"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export interface OrderItem { id: number; productId: number; productName: string; unit: string; price: number; quantity: number; total: number }
export interface OrderPayment { id: number; amount: number; paymentMode: "CASH" | "ONLINE" | "UNKNOWN"; paymentDate: string; notes: string | null }
export interface Order { id: number; orderNumber: string; customerName: string; customerMobile: string; deliveryAddress: string | null; notes: string | null; subtotal: number; finalAmount: number; status: OrderStatus | "UNKNOWN"; items: OrderItem[]; payments: OrderPayment[]; cashTotal: number; onlineTotal: number; paidTotal: number; due: number; paymentStatus: PaymentStatus | "UNKNOWN"; createdAt: string; updatedAt: string }
export interface OrderFilters { search: string; status: OrderStatus | ""; paymentStatus: PaymentStatus | ""; from: string; to: string }
export interface OrdersPage { orders: Order[]; total: number; page: number; pages: number }
export interface ProductChoice { id: number; name: string; unit: string; price: number; stock: number; isActive: boolean }
