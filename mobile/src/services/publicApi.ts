import { API_ROOT_URL, API_TIMEOUTS, apiRequest } from "./apiClient";
import type {
  AssistantRequest, AssistantResponse, CategoriesResponse, CreateOrderPayload, CreateOrderResponse,
  ProductQuery, ProductResponse, ProductsResponse, SettingsResponse, TrackOrderResponse, TrackOrdersByMobileResponse,
} from "@/types/api";

function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const pairs = Object.entries(values).filter(([, value]) => value !== undefined);
  return pairs.length ? `?${pairs.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}` : "";
}

export const publicApi = {
  getSettings: (signal?: AbortSignal) => apiRequest<SettingsResponse>("/settings/public", { signal }),
  getCategories: (signal?: AbortSignal) => apiRequest<CategoriesResponse>("/categories", { signal }),
  getProducts: (params: ProductQuery = {}, signal?: AbortSignal) =>
    apiRequest<ProductsResponse>(`/products${queryString({ category: params.category, search: params.search, page: params.page, limit: params.limit, sort: params.sort, inStock: params.inStock })}`, { signal }),
  getProductById: (id: number, signal?: AbortSignal) => apiRequest<ProductResponse>(`/products/${id}`, { signal }),
  createOrder: (payload: CreateOrderPayload, idempotencyKey: string) => apiRequest<CreateOrderResponse>("/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload), timeoutMs: API_TIMEOUTS.order }),
  trackOrder: (orderNumber: string, customerMobile: string, signal?: AbortSignal) =>
    apiRequest<TrackOrderResponse>(`/orders/track${queryString({ orderNumber, customerMobile })}`, { signal }),
  // Service support only. The Phase 2 UI intentionally does not expose this
  // privacy-sensitive lookup until ownership protection is added server-side.
  trackOrdersByMobile: (customerMobile: string, signal?: AbortSignal) =>
    apiRequest<TrackOrdersByMobileResponse>(`/orders/track-by-mobile${queryString({ customerMobile })}`, { signal }),
  sendConstructionAssistantMessage: (payload: AssistantRequest, signal?: AbortSignal) =>
    apiRequest<AssistantResponse>("/construction-assistant/chat", { method: "POST", body: JSON.stringify(payload), timeoutMs: API_TIMEOUTS.assistant, signal }),
  health: (signal?: AbortSignal) => apiRequest<{ success: boolean; status: string }>("/health", { signal, timeoutMs: API_TIMEOUTS.health }, API_ROOT_URL),
};
