import { API_BASE_URL } from "@/services/apiClient";

export const FALLBACK_IMAGE = require("../../assets/icon.png");
export const IMAGE_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export function resolveImageUrl(url: string | null | undefined, width = 400): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${Math.round(width)}/`);
  }
  if (/^https?:\/\//i.test(url)) return url;
  const backendOrigin = API_BASE_URL.replace(/\/api\/public$/, "");
  return `${backendOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
}
