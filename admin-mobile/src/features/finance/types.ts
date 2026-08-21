export type PaymentMode="CASH"|"ONLINE";export type PaymentStatus="DUE"|"PARTIALLY_PAID"|"PAID"|"UNKNOWN";
export interface DueOrder{id:number;orderNumber:string;createdAt:string;finalAmount:number;cashPaid:number;onlinePaid:number;paid:number;due:number;paymentStatus:PaymentStatus}
export interface DueCustomer{customerName:string;customerMobile:string;totalOrders:number;totalPurchase:number;totalPaid:number;totalDue:number;orders:DueOrder[]}
export interface PaymentHistory{id:number;orderNumber:string;amount:number;paymentMode:PaymentMode|"UNKNOWN";paymentDate:string;notes:string|null;previousDue:number;remainingDue:number}
export interface CustomerDetail{customer:Omit<DueCustomer,"orders">;orders:DueOrder[];paymentHistory:PaymentHistory[]}
export interface DueFilters{search:string;dateRange:""|"today"|"week"|"month";paymentStatus:""|"DUE"|"PARTIALLY_PAID"|"PAID";from:string;to:string}
export interface Bill{id:number;orderId:number;subtotal:number;discount:number;finalAmount:number;createdAt:string;updatedAt:string}
export interface PaymentPayload{amount:number;paymentMode:PaymentMode;paymentDate?:string;notes?:string}
