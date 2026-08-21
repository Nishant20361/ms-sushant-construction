import CookieManager from "@preeternal/react-native-cookie-manager";
import { environment } from "@/config/environment";
import { AdminAppError } from "@/types/errors";

const AUTH_COOKIE = "ms_sushant_admin_token";
const CSRF_COOKIE = "ms_sushant_csrf";
const CSRF_HEADER = "X-CSRF-Token";

export interface AuthRequestContext { method: string; forceCsrfRefresh?: boolean }

export class NativeCookieAuthTransport {
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;

  async prepareRequest({ method, forceCsrfRefresh = false }: AuthRequestContext) {
    const headers: Record<string, string> = {};
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      if (forceCsrfRefresh) this.csrfToken = null;
      headers[CSRF_HEADER] = await this.getCsrfToken();
    }
    return { headers, credentials: "include" as RequestCredentials };
  }

  async persistCookies() { await CookieManager.flush(); }

  async clear() {
    this.csrfToken = null;
    this.csrfPromise = null;
    try {
      await Promise.all([
        CookieManager.clearByName(environment.apiBaseUrl, AUTH_COOKIE),
        CookieManager.clearByName(environment.apiBaseUrl, CSRF_COOKIE),
      ]);
    } catch {
      // Older Android WebView providers cannot clear by name. This app's
      // cookie jar is dedicated to its API, so full app-store cleanup is safe.
      await CookieManager.clearAllStores();
    }
  }

  invalidateCsrf() { this.csrfToken = null; }

  private getCsrfToken(): Promise<string> {
    if (this.csrfToken) return Promise.resolve(this.csrfToken);
    if (this.csrfPromise) return this.csrfPromise;
    this.csrfPromise = this.fetchCsrfToken().finally(() => { this.csrfPromise = null; });
    return this.csrfPromise;
  }

  private async fetchCsrfToken() {
    let response: Response;
    try {
      response = await fetch(`${environment.apiBaseUrl}/csrf`, { credentials: "include" });
    } catch (cause) {
      throw new AdminAppError("network", "You're offline. Connect to the internet to continue.", { cause });
    }
    if (!response.ok) throw new AdminAppError("server", "Security initialization failed. Please try again.", { status: response.status });
    const payload = await response.json() as { token?: unknown };
    if (typeof payload.token !== "string" || payload.token.length < 32) throw new AdminAppError("server", "Security initialization failed. Please try again.");
    this.csrfToken = payload.token;
    await this.persistCookies();
    return payload.token;
  }
}

export const nativeCookieAuthTransport = new NativeCookieAuthTransport();
