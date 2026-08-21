const PRODUCTION_API_BASE_URL = "https://ms-sushant-construction.onrender.com/api";

function normalizeApiBaseUrl(value: string | undefined): string {
  const candidate = value?.trim() || PRODUCTION_API_BASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("EXPO_PUBLIC_ADMIN_API_BASE_URL must be an absolute URL.");
  }

  const developmentHttp = __DEV__ && parsed.protocol === "http:" && ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !developmentHttp) {
    throw new Error("Admin API configuration must use HTTPS outside local development.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Admin API URL must not contain credentials.");
  }
  return candidate.replace(/\/+$/, "");
}

export const environment = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(process.env.EXPO_PUBLIC_ADMIN_API_BASE_URL),
  requestTimeoutMs: 15_000,
  isDevelopment: __DEV__,
});
