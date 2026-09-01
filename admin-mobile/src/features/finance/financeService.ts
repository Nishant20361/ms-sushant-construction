import { adminApiClient } from "@/services/api/client";
import { normalizeOrder, normalizeOrdersPage } from "@/features/orders/normalize";
import { normalizeProduct } from "@/features/products/helpers";
import type { Product } from "@/features/products/types";
import { normalizeBill, normalizeCustomer, normalizeCustomerDetail, query } from "./helpers";
import type {
  ChangePinPayload,
  DueFilters,
  KhatabookAuthStatus,
  PaymentPayload,
  ResetPinPayload,
} from "./types";

export const financeService = {
  snapshot: async (f: DueFilters, signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ customers: unknown[] }>(
      `/admin/orders/due-snapshot?${query(f)}`,
      { signal }
    );
    return Array.isArray(r.customers) ? r.customers.map(normalizeCustomer) : [];
  },
  customer: (mobile: string, signal?: AbortSignal) =>
    adminApiClient
      .request(`/admin/orders/customer/${encodeURIComponent(mobile)}`, { signal })
      .then(normalizeCustomerDetail),
  customerPayment: (mobile: string, p: PaymentPayload) =>
    adminApiClient.request(`/admin/orders/customer/${encodeURIComponent(mobile)}/payments`, {
      method: "POST",
      body: p,
    }),
  orderPayment: async (id: number, p: PaymentPayload) => {
    const r = await adminApiClient.request<{ order: unknown }>(`/admin/orders/${id}/payments`, {
      method: "POST",
      body: p,
    });
    return normalizeOrder(r.order);
  },
  bill: async (id: number, signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ bill: unknown }>(`/admin/orders/${id}/bill`, { signal });
    return normalizeBill(r.bill);
  },
  saveBill: async (id: number, discount: number, exists: boolean) => {
    const r = await adminApiClient.request<{ bill: unknown }>(`/admin/orders/${id}/bill`, {
      method: exists ? "PUT" : "POST",
      body: { discount },
    });
    return normalizeBill(r.bill)!;
  },
  billText: (id: number) =>
    adminApiClient.request<string>(`/admin/orders/${id}/bill/text`, { responseType: "text" }),
  billHtml: (id: number) =>
    adminApiClient.request<string>(`/admin/orders/${id}/bill/html`, { responseType: "text" }),
  orders: (search: string, page: number, signal?: AbortSignal) =>
    adminApiClient
      .request(`/admin/orders?${query({ search, page, limit: 20 })}`, { signal })
      .then(normalizeOrdersPage),
  authStatus: async (signal?: AbortSignal) =>
    adminApiClient.request<KhatabookAuthStatus>("/admin/khatabook/auth-status", { signal }),
  verifyPin: async (pin: string) =>
    adminApiClient.request<{ success: boolean; message?: string }>("/admin/khatabook/verify-pin", {
      method: "POST",
      body: { pin },
    }),
  changePin: async (payload: ChangePinPayload) =>
    adminApiClient.request<{ success: boolean; message?: string }>("/admin/khatabook/change-pin", {
      method: "POST",
      body: payload,
    }),
  forgotPin: async () =>
    adminApiClient.request<{ success: boolean; message?: string }>("/admin/khatabook/forgot-pin", {
      method: "POST",
    }),
  resetPin: async (payload: ResetPinPayload) =>
    adminApiClient.request<{ success: boolean; message?: string }>("/admin/khatabook/reset-pin", {
      method: "POST",
      body: payload,
    }),
  statement: async (mobile: string, signal?: AbortSignal) =>
    adminApiClient.request<unknown>(
      `/admin/orders/customer/${encodeURIComponent(mobile)}/statement`,
      { signal }
    ),
  stockProducts: async (signal?: AbortSignal): Promise<Product[]> => {
    const r = await adminApiClient.request<{ products: unknown[] }>("/admin/products?limit=100", {
      signal,
    });
    return Array.isArray(r.products) ? r.products.map(normalizeProduct) : [];
  },
};
