import { UPLOADS_BASE } from "../config";

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
 * helper avoids double-prefixing the uploads base:
 *   - full URL  -> returned unchanged
 *   - already prefixed with `/uploads` -> returned unchanged
 *   - otherwise -> `UPLOADS_BASE` is prepended
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith(UPLOADS_BASE)) return url;
  if (url.startsWith("/uploads/")) return url;
  return `${UPLOADS_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

