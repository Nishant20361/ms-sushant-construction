const PRODUCTION_API_BASE = "https://ms-sushant-construction.onrender.com/api/public";
export const API_TIMEOUTS = { publicGet: 20_000, assistant: 35_000, order: 35_000, health: 10_000 } as const;

function normalizeApiBase(configured: string | undefined): string {
  const candidate = configured?.trim() || PRODUCTION_API_BASE;
  try {
    const url = new URL(candidate);
    const validProtocol = url.protocol === "https:" || (__DEV__ && url.protocol === "http:");
    const validShape = validProtocol && Boolean(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
    if (!validShape) throw new Error("unsupported URL");
    url.pathname = url.pathname.replace(/\/+$/, "");
    if (!url.pathname.endsWith("/api/public")) throw new Error("missing /api/public");
    return url.toString().replace(/\/$/, "");
  } catch {
    if (__DEV__) throw new Error("Invalid EXPO_PUBLIC_API_BASE_URL. Use http://<LAN-IP>:5100/api/public or an HTTPS /api/public URL.");
    return PRODUCTION_API_BASE;
  }
}

export const API_BASE_URL = normalizeApiBase(process.env.EXPO_PUBLIC_API_BASE_URL);
export const API_ROOT_URL = API_BASE_URL.replace(/\/public$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to reach the server. Check your connection and try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  readonly likelyColdStart = true;
  constructor(message = "The server is taking longer than expected to start.") {
    super(message);
    this.name = "TimeoutError";
  }
}

interface RequestOptions extends RequestInit { timeoutMs?: number }

export async function apiRequest<T>(path: string, options: RequestOptions = {}, baseUrl = API_BASE_URL): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? API_TIMEOUTS.publicGet;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text();
    let data: unknown = undefined;
    if (text) {
      try { data = JSON.parse(text); } catch { throw new ApiError(response.status >= 500 ? "The server is temporarily unavailable. Please try again." : "The server returned an invalid response.", response.status); }
    }
    if (!response.ok) {
      const body = data as { error?: string; details?: unknown } | undefined;
      const safeMessage = response.status >= 500 ? "The server is temporarily unavailable. Please try again." : response.status === 429 ? "Too many requests. Please wait a little and try again." : body?.error || "The request could not be completed.";
      throw new ApiError(safeMessage, response.status, body?.details);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted && !externalSignal?.aborted) throw new TimeoutError();
    if (externalSignal?.aborted) throw Object.assign(new Error("Request cancelled"), { name: "AbortError" });
    if (__DEV__) console.warn("[API] Network request failed", error instanceof Error ? error.name : "unknown");
    throw new NetworkError("We couldn't connect to the server. Please try again.");
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
