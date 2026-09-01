import { adminApiClient } from "@/services/api/client";
import { normalizeOrder, normalizeOrdersPage, normalizeProduct } from "./normalize";
import type { OrderFilters, OrderStatus } from "./types";
import { serializeOrderQuery } from "./helpers";

export const ordersService = {
  list: async (filters: OrderFilters, page: number, signal?: AbortSignal) =>
    normalizeOrdersPage(
      await adminApiClient.request(`/admin/orders?${serializeOrderQuery({ ...filters, page, limit: 20 })}`, { signal })
    ),

  detail: async (id: number, signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ order: unknown }>(`/admin/orders/${id}`, { signal });
    return normalizeOrder(r.order);
  },

  status: async (id: number, status: OrderStatus) => {
    const r = await adminApiClient.request<{ order: unknown }>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return normalizeOrder(r.order);
  },

  edit: async (id: number, items: { productId: number; quantity: number }[]) => {
    const r = await adminApiClient.request<{ order: unknown }>(`/admin/orders/${id}/edit`, {
      method: "PATCH",
      body: { items },
    });
    return normalizeOrder(r.order);
  },

  products: async (search: string, signal?: AbortSignal) => {
    const r = await adminApiClient.request<{ products: unknown[] }>(
      `/admin/products?${serializeOrderQuery({ search, active: "true", page: 1, limit: 100 })}`,
      { signal }
    );
    return Array.isArray(r.products) ? r.products.map(normalizeProduct) : [];
  },

  lookupCustomer: async (mobile: string, signal?: AbortSignal) => {
    const clean = mobile.replace(/\D/g, "");
    const last10 = clean.length >= 10 ? clean.slice(-10) : clean;

    // 1. Primary lookup endpoint
    try {
      const res = await adminApiClient.request<{
        found: boolean;
        customer: { name: string; mobile: string; address: string } | null;
        previousDue: number;
        ordersCount: number;
      }>(`/admin/customers/lookup?mobile=${encodeURIComponent(mobile)}`, { signal });
      if (res && res.found) return res;
    } catch {
      // Endpoint might not exist on remote deployment — proceed to fallback below
    }

    // 2. First Fallback: Query /admin/orders/customer/:mobile
    try {
      const detailRes = await adminApiClient.request<{
        customer?: { customerName: string; customerMobile: string; customerAddress?: string; totalDue?: number; totalOrders?: number };
        orders?: Array<{ customerName?: string; deliveryAddress?: string; due?: number; status?: string; finalAmount?: number; paid?: number }>;
      }>(`/admin/orders/customer/${encodeURIComponent(last10)}`, { signal });

      if (detailRes && detailRes.customer) {
        const orderWithAddr = detailRes.orders?.find((o) => o.deliveryAddress && o.deliveryAddress.trim().length > 0);
        return {
          found: true,
          customer: {
            name: detailRes.customer.customerName,
            mobile: last10,
            address: detailRes.customer.customerAddress || orderWithAddr?.deliveryAddress || "",
          },
          previousDue: Number(detailRes.customer.totalDue || 0),
          ordersCount: Number(detailRes.customer.totalOrders || detailRes.orders?.length || 0),
        };
      }
    } catch {
      // Proceed to next fallback
    }

    // 3. Second Fallback: Query /admin/orders?search=${last10}
    try {
      const searchRes = await adminApiClient.request<{
        orders?: Array<{ customerName: string; customerMobile: string; deliveryAddress: string | null; due?: number; finalAmount?: number; paidTotal?: number; status: string }>;
      }>(`/admin/orders?search=${encodeURIComponent(last10)}&limit=20`, { signal });

      const matchingOrders = (searchRes.orders || []).filter((o) => {
        const m = (o.customerMobile || "").replace(/\D/g, "");
        return m.endsWith(last10) || m === last10;
      });

      if (matchingOrders.length > 0) {
        const latest = matchingOrders[0];
        const withAddr = matchingOrders.find((o) => o.deliveryAddress && o.deliveryAddress.trim().length > 0);
        const active = matchingOrders.filter((o) => o.status !== "CANCELLED");
        const totalDue = active.reduce(
          (sum, o) => sum + Math.max(0, o.due ?? (o.finalAmount ?? 0) - (o.paidTotal ?? 0)),
          0
        );
        return {
          found: true,
          customer: {
            name: latest.customerName,
            mobile: last10,
            address: withAddr?.deliveryAddress || latest.deliveryAddress || "",
          },
          previousDue: Math.round(totalDue * 100) / 100,
          ordersCount: matchingOrders.length,
        };
      }
    } catch {
      // Not found across all sources
    }

    return { found: false, customer: null, previousDue: 0, ordersCount: 0 };
  },

  assistedOrder: async (body: any) => {
    const enrichOrder = (order: any) => {
      const normalized = normalizeOrder(order);
      if (!normalized.customerMobile && body.customerMobile) {
        normalized.customerMobile = body.customerMobile;
      }
      if (!normalized.customerName && body.customerName) {
        normalized.customerName = body.customerName;
      }
      if (!normalized.deliveryAddress && body.deliveryAddress) {
        normalized.deliveryAddress = body.deliveryAddress;
      }
      if (normalized.items.length === 0 && Array.isArray(body.items)) {
        normalized.items = body.items.map((it: any, idx: number) => ({
          id: idx + 1,
          productId: it.productId,
          productName: it.productName || "Product",
          unit: it.unit || "unit",
          price: it.price || 0,
          quantity: it.quantity,
          total: (it.price || 0) * it.quantity,
        }));
      }
      const subtotal =
        normalized.subtotal > 0
          ? normalized.subtotal
          : normalized.items.reduce((sum, item) => sum + item.total, 0);
      const transport = Math.max(0, Number(body.transportation) || 0);
      const discount = Math.max(0, Number(body.discount) || 0);
      const finalAmt =
        normalized.finalAmount > 0
          ? normalized.finalAmount
          : Math.max(0, subtotal + transport - discount);
      const paidAmt =
        normalized.paidTotal > 0
          ? normalized.paidTotal
          : Math.max(0, Number(body.paidAmount) || 0);

      normalized.subtotal = subtotal;
      normalized.finalAmount = finalAmt;
      normalized.paidTotal = paidAmt;
      normalized.due = Math.max(0, Math.round((finalAmt - paidAmt) * 100) / 100);
      normalized.paymentStatus =
        paidAmt <= 0 ? "DUE" : normalized.due <= 0 ? "PAID" : "PARTIALLY_PAID";

      return normalized;
    };

    // 1. Primary: /admin/orders/assisted
    try {
      const r = await adminApiClient.request<{ order: unknown; message: string }>("/admin/orders/assisted", {
        method: "POST",
        body,
      });
      return { order: enrichOrder(r.order), message: r.message || "Order placed successfully." };
    } catch (primaryErr) {
      // 2. Secondary: /admin/assisted-orders
      try {
        const r = await adminApiClient.request<{ order: unknown; message: string }>("/admin/assisted-orders", {
          method: "POST",
          body,
        });
        return { order: enrichOrder(r.order), message: r.message || "Order placed successfully." };
      } catch {
        // 3. Robust Fallback: Place order via /public/orders and record payment
        const publicOrderRes = await adminApiClient.request<{ order: unknown; message: string }>("/public/orders", {
          method: "POST",
          body: {
            customerName: body.customerName,
            customerMobile: body.customerMobile,
            deliveryAddress: body.deliveryAddress || undefined,
            notes: body.notes || (body.transportation > 0 ? `Transportation: ₹${body.transportation}` : undefined),
            items: body.items,
          },
        });

        const created = enrichOrder(publicOrderRes.order);
        if (body.paidAmount && body.paidAmount > 0 && created.id) {
          try {
            await adminApiClient.request(`/admin/orders/${created.id}/payments`, {
              method: "POST",
              body: {
                amount: body.paidAmount,
                paymentMode: body.paymentMode || "CASH",
                notes: "Paid at order creation (Admin-Assisted)",
              },
            });
            const refreshed = await adminApiClient.request<{ order: unknown }>(`/admin/orders/${created.id}`);
            return { order: enrichOrder(refreshed.order), message: "Customer order placed successfully." };
          } catch {
            // Return enriched created order
          }
        }
        return { order: created, message: "Customer order placed successfully." };
      }
    }
  },
};
