import { environment } from "@/config/environment";
import { AdminAppError } from "@/types/errors";
import { errorFromResponse, normalizeUnknownError } from "@/utils/errors";
import { nativeCookieAuthTransport, type NativeCookieAuthTransport } from "./cookieTransport";
import { shouldInvalidateSession, shouldRetryCsrf } from "@/features/auth/authPolicy";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface ApiRequestOptions {
  method?: HttpMethod; body?: unknown | FormData; headers?: Record<string, string>; timeoutMs?: number;
  responseType?: "json" | "text" | "blob" | "arrayBuffer"; signal?: AbortSignal; suppressUnauthorizedEvent?: boolean;
}
type UnauthorizedHandler = (error: AdminAppError) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) { unauthorizedHandler = handler; }

interface ErrorPayload { error?: string; details?: { path: string; message: string }[] }

export class AdminApiClient {
  constructor(private readonly baseUrl = environment.apiBaseUrl, private readonly auth: NativeCookieAuthTransport = nativeCookieAuthTransport) {}

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    return this.execute<T>(path, options, method, false);
  }

  private async execute<T>(path: string, options: ApiRequestOptions, method: HttpMethod, csrfRetried: boolean): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? environment.requestTimeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const auth = await this.auth.prepareRequest({ method, forceCsrfRefresh: csrfRetried });
      const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
      const headers: Record<string, string> = { ...auth.headers, ...options.headers };
      if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
      const response = await fetch(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
        method, headers, body: options.body === undefined ? undefined : isForm ? options.body as FormData : JSON.stringify(options.body),
        credentials: auth.credentials, signal: controller.signal,
      });
      if (!response.ok) {
        let payload: ErrorPayload | null = null;
        try { payload = await response.json() as ErrorPayload; } catch { payload = null; }
        if (!["GET", "HEAD"].includes(method) && shouldRetryCsrf(response.status, payload?.error, csrfRetried)) {
          this.auth.invalidateCsrf();
          return await this.execute<T>(path, options, method, true);
        }
        const error = errorFromResponse(response.status, payload);
        if (shouldInvalidateSession(response.status, options.suppressUnauthorizedEvent)) unauthorizedHandler?.(error);
        throw error;
      }
      if (response.status === 204) return undefined as T;
      if (options.responseType === "text") return await response.text() as T;
      if (options.responseType === "blob") return await response.blob() as T;
      if (options.responseType === "arrayBuffer") return await response.arrayBuffer() as T;
      return await response.json() as T;
    } catch (error) {
      throw normalizeUnknownError(error);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}
export const adminApiClient = new AdminApiClient();
