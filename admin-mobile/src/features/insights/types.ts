export type Dict = Record<string, unknown>;
export interface NotificationItem { id:number; type:string; title:string; message:string; orderId:number|null; productId:number|null; orderNumber:string; customerName:string; status:string; read:boolean; createdAt:string|null }
export interface NotificationPage { notifications:NotificationItem[]; total:number; unreadCount:number }
export type SalesPeriod = "daily"|"weekly"|"monthly";
export interface ReportOrder { id:number; orderNumber:string; customerName:string; customerMobile:string; createdAt:string; status:string; finalAmount:number; totalPaid:number; remainingDue:number; paymentStatus:string }
export interface ReportPayment { id:number; orderNumber:string; customerName:string; customerMobile:string; orderCreatedAt:string; subtotal:number; originalBillAmount:number; paymentDate:string; amount:number; paymentMode:string; previouslyPaidBeforePeriod:number; previouslyPaidBeforePayment:number; dueBeforePayment:number; totalPaidAfterPayment:number; remainingBalanceAfterPayment:number; paymentStatusAfterPayment:string; saleCreatedInPeriod:boolean; salePeriodType:"CURRENT_PERIOD_SALE"|"OLDER_SALE_PREVIOUS_DUE"; dueCleared:boolean; dueClearedAmount:number|null; dueClearedAt:string|null }
export interface SalesReport { reportType:SalesPeriod; periodLabel:string; generatedAt:string; generatedBy:string; summary:Dict; collections:Dict; orders:ReportOrder[]; payments:ReportPayment[]; previousDuePayments:ReportPayment[] }
export interface ChartPoint { label:string; value:number }
