// API base URL: use Vite proxy in dev, env override in production build.
export const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";
export const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE as string) || "/uploads";

export function isDirectAndroidApkUrl(value: string | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password && /\.apk$/i.test(url.pathname);
  } catch {
    return false;
  }
}

const PUBLIC_ANDROID_APK_URL = "https://github.com/Nishant20361/ms-sushant-construction-releases/releases/download/customer-app-v1.0.3/MS-Sushant-Construction-v1.0.3.apk";
const configuredAndroidAppUrl = (import.meta.env.VITE_ANDROID_APP_URL as string | undefined)?.trim();
export const ANDROID_APP_URL = isDirectAndroidApkUrl(configuredAndroidAppUrl)
  ? configuredAndroidAppUrl
  : PUBLIC_ANDROID_APK_URL;
