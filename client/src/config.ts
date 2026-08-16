// API base URL: use Vite proxy in dev, env override in production build.
export const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";
export const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE as string) || "/uploads";
export const ANDROID_APP_URL = (import.meta.env.VITE_ANDROID_APP_URL as string | undefined)?.trim() || "";
