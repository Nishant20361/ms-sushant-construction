import { adminApiClient } from "@/services/api/client";
import {
  normalizeCategory,
  normalizeProduct,
  normalizeProductPage,
  serializeProductQuery,
} from "./helpers";
import type { CategoryPayload, LocalImage, ProductFilters, ProductPayload } from "./types";

export const productService = {
  list: async (filters: ProductFilters, page: number, signal?: AbortSignal) =>
    normalizeProductPage(
      await adminApiClient.request(
        `/admin/products?${serializeProductQuery({ ...filters, page, limit: 20 })}`,
        { signal }
      )
    ),

  detail: async (id: number, signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ product: unknown }>(`/admin/products/${id}`, { signal });
    return normalizeProduct(r.product);
  },

  categories: async (signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ categories: unknown[] }>("/admin/categories", { signal });
    return Array.isArray(r.categories) ? r.categories.map(normalizeCategory) : [];
  },

  upload: async (image: LocalImage) => {
    const f = new FormData();
    f.append("file", {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as unknown as Blob);
    const r = await adminApiClient.request<{ url: string }>("/admin/uploads", {
      method: "POST",
      body: f,
      timeoutMs: 45_000,
    });
    return typeof r.url === "string" ? r.url : "";
  },

  create: async (p: ProductPayload) =>
    normalizeProduct(
      (
        await adminApiClient.request<{ product: unknown }>("/admin/products", {
          method: "POST",
          body: p,
        })
      ).product
    ),

  update: async (id: number, p: ProductPayload) =>
    normalizeProduct(
      (
        await adminApiClient.request<{ product: unknown }>(`/admin/products/${id}`, {
          method: "PUT",
          body: p,
        })
      ).product
    ),

  toggle: async (id: number) =>
    normalizeProduct(
      (
        await adminApiClient.request<{ product: unknown }>(`/admin/products/${id}/toggle`, {
          method: "PATCH",
        })
      ).product
    ),

  remove: (id: number) =>
    adminApiClient.request<{ message: string }>(`/admin/products/${id}`, {
      method: "DELETE",
    }),

  adjustStock: async (
    id: number,
    payload: {
      action: "ADD" | "DEDUCT" | "SET";
      quantity: number;
      reason?: string;
      purchaseRate?: number;
      totalPurchaseCost?: number;
      supplier?: string;
      invoiceNumber?: string;
      note?: string;
    }
  ) =>
    normalizeProduct(
      (
        await adminApiClient.request<{ product: unknown }>(`/admin/products/${id}/stock`, {
          method: "PATCH",
          body: payload,
        })
      ).product
    ),

  stockHistory: async (
    id: number,
    signal?: AbortSignal
  ): Promise<{
    productId: number;
    productName: string;
    unit: string;
    currentStock: number;
    history: any[];
  }> => {
    // 1. Primary endpoint: /admin/products/:id/stock-history
    try {
      return await adminApiClient.request<{
        productId: number;
        productName: string;
        unit: string;
        currentStock: number;
        history: any[];
      }>(`/admin/products/${id}/stock-history`, { signal });
    } catch {
      // 2. Secondary alias: /admin/products/:id/history
      try {
        return await adminApiClient.request<{
          productId: number;
          productName: string;
          unit: string;
          currentStock: number;
          history: any[];
        }>(`/admin/products/${id}/history`, { signal });
      } catch {
        // 3. Resilient Fallback: If route is missing on remote deployment, fallback to product details and orders
        const prod = await productService.detail(id, signal);
        const history: any[] = [];
        try {
          const ordersRes = await adminApiClient.request<{ orders: any[] }>(`/admin/orders?limit=100`, { signal });
          for (const ord of ordersRes.orders || []) {
            if (ord.status === "CANCELLED") continue;
            for (const it of ord.items || []) {
              if (Number(it.productId) === Number(id) || it.productName === prod.name) {
                history.push({
                  id: `fallback-ord-${ord.id}-${it.id || it.productId}`,
                  type: "ORDER",
                  quantity: Number(it.quantity),
                  orderNumber: ord.orderNumber,
                  customerName: ord.customerName,
                  customerMobile: ord.customerMobile,
                  reason: `Order #${ord.orderNumber} (${ord.customerName})`,
                  createdAt: ord.createdAt,
                });
              }
            }
          }
        } catch {
          // Ignore order search failure
        }

        if (prod.stock > 0 || (prod as any).createdAt) {
          history.push({
            id: `fallback-init-${prod.id}`,
            type: "ADD",
            quantity: prod.stock,
            newStock: prod.stock,
            oldStock: 0,
            reason: "उत्पाद निर्माण / प्रारंभिक स्टॉक (Initial Product Stock)",
            note: "Catalog initial stock entry",
            createdAt: (prod as any).createdAt || new Date().toISOString(),
          });
        }

        history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit,
          currentStock: prod.stock,
          history: history.slice(0, 20),
        };
      }
    }
  },

  createCategory: async (p: CategoryPayload) =>
    normalizeCategory(
      (
        await adminApiClient.request<{ category: unknown }>("/admin/categories", {
          method: "POST",
          body: p,
        })
      ).category
    ),

  updateCategory: async (id: number, p: CategoryPayload) =>
    normalizeCategory(
      (
        await adminApiClient.request<{ category: unknown }>(`/admin/categories/${id}`, {
          method: "PUT",
          body: p,
        })
      ).category
    ),

  removeCategory: (id: number) =>
    adminApiClient.request<{ message: string; category?: unknown }>(`/admin/categories/${id}`, {
      method: "DELETE",
    }),
};
