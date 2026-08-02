import { UPLOADS_BASE } from "../config";
import type { OrderStatus } from "../types";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  OUT_FOR_DELIVERY: "Out For Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function formatOrderStatus(status: OrderStatus | string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Resolve an image URL for display.
 *
 * The backend stores image URLs as absolute paths like `/uploads/abc.webp`.
 * They may also be stored as full URLs (`https://…`) in some cases. This
 * helper converts relative paths to a full backend URL:
 *
 *   - full URL (`http://` / `https://`) → returned unchanged
 *   - already prefixed with `UPLOADS_BASE` → returned unchanged
 *   - relative path starting with `/uploads/` → `UPLOADS_BASE` + filename
 *   - otherwise → `UPLOADS_BASE` is prepended
 *
 * In production the frontend and API live on different origins, so relative
 * `/uploads/` paths must be converted to the backend URL or they will 404.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith(UPLOADS_BASE)) return url;
  // Convert relative /uploads/ paths to the backend URL
  if (url.startsWith("/uploads/")) {
    return `${UPLOADS_BASE}${url.replace(/^\/uploads/, "")}`;
  }
  return `${UPLOADS_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

