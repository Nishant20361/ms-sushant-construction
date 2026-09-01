import { ORDER_STATUSES, PAYMENT_STATUSES, type Order, type OrdersPage, type ProductChoice } from "./types";
const rec = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const text = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const nullable = (v: unknown) => typeof v === "string" && v.trim() ? v : null;
export function normalizeOrder(value: unknown): Order {
  const v = rec(value);
  const bill = rec(v.bill);
  const subtotal = num(v.subtotal);
  const billFinal = num(bill.finalAmount);
  const finalAmount = num(v.finalAmount) > 0 ? num(v.finalAmount) : billFinal > 0 ? billFinal : subtotal;

  const items = Array.isArray(v.items)
    ? v.items.map((x) => {
        const i = rec(x);
        const price = num(i.price);
        const qty = num(i.quantity);
        return {
          id: num(i.id),
          productId: num(i.productId),
          productName: text(i.productName, "Product"),
          unit: text(i.unit),
          price,
          quantity: qty,
          total: num(i.total) > 0 ? num(i.total) : price * qty,
        };
      })
    : [];

  const payments = Array.isArray(v.payments)
    ? v.payments.map((x) => {
        const p = rec(x);
        return {
          id: num(p.id),
          amount: num(p.amount),
          paymentMode:
            p.paymentMode === "CASH" || p.paymentMode === "ONLINE"
              ? (p.paymentMode as any)
              : "UNKNOWN",
          paymentDate: text(p.paymentDate),
          notes: nullable(p.notes),
        };
      })
    : [];

  const computedCash = payments
    .filter((p) => p.paymentMode === "CASH")
    .reduce((s, p) => s + p.amount, 0);
  const computedOnline = payments
    .filter((p) => p.paymentMode === "ONLINE")
    .reduce((s, p) => s + p.amount, 0);

  const cashTotal = num(v.cashTotal) > 0 ? num(v.cashTotal) : computedCash;
  const onlineTotal = num(v.onlineTotal) > 0 ? num(v.onlineTotal) : computedOnline;
  const paidTotal =
    num(v.paidTotal) > 0 ? num(v.paidTotal) : cashTotal + onlineTotal;

  const due =
    v.due !== undefined && v.due !== null && !Number.isNaN(Number(v.due)) && num(v.due) >= 0
      ? num(v.due)
      : Math.max(0, Math.round((finalAmount - paidTotal) * 100) / 100);

  const paymentStatus = PAYMENT_STATUSES.includes(v.paymentStatus as never)
    ? (v.paymentStatus as Order["paymentStatus"])
    : v.paymentStatus !== undefined
    ? "UNKNOWN"
    : paidTotal <= 0
    ? "DUE"
    : due <= 0
    ? "PAID"
    : "PARTIALLY_PAID";

  return {
    id: num(v.id),
    orderNumber: text(v.orderNumber, "Order"),
    customerName: text(v.customerName, "Customer not provided"),
    customerMobile:
      text(v.customerMobile) || text(v.mobile) || text(rec(v.customer).mobile),
    deliveryAddress:
      nullable(v.deliveryAddress) || nullable(rec(v.customer).address),
    notes: nullable(v.notes),
    source:
      typeof v.source === "string"
        ? (v.source as any)
        : typeof v.notes === "string" && v.notes.includes("Admin-Assisted")
        ? "ADMIN_ASSISTED"
        : "CUSTOMER_WEB",
    subtotal,
    finalAmount,
    status: ORDER_STATUSES.includes(v.status as never)
      ? (v.status as Order["status"])
      : "UNKNOWN",
    items,
    payments,
    cashTotal,
    onlineTotal,
    paidTotal,
    due,
    paymentStatus,
    createdAt: text(v.createdAt) || new Date().toISOString(),
    updatedAt: text(v.updatedAt) || new Date().toISOString(),
  };
}
export function normalizeOrdersPage(value:unknown):OrdersPage {const v=rec(value);return{orders:Array.isArray(v.orders)?v.orders.map(normalizeOrder):[],total:num(v.total),page:Math.max(1,num(v.page)||1),pages:Math.max(1,num(v.pages)||1)}}
export function normalizeProduct(value:unknown):ProductChoice {const v=rec(value);const cat=rec(v.category);const imgs=Array.isArray(v.images)?v.images.map(x=>{const im=rec(x);return{url:text(im.url),alt:nullable(im.alt)}}):[];return{id:num(v.id),name:text(v.name,"Product"),unit:text(v.unit),price:num(v.price),mrp:num(v.mrp)||num(v.price),stock:num(v.stock),isActive:v.isActive===true,categoryId:num(v.categoryId)||num(cat.id)||undefined,categoryName:text(cat.name)||undefined,imageUrl:text(v.imageUrl)||imgs[0]?.url||null,images:imgs}}
