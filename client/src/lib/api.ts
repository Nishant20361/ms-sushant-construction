import { API_BASE } from "../config";
import type {
  ApiError,
  Category,
  DashboardStats,
  Order,
  OrderItemInput,
  Product,
  SiteSettings,
} from "../types";

// ------------------------------------------------------------------
// CSRF handling
// The backend issues a CSRF cookie AND returns the token in the JSON body
// of GET /api/csrf. We attach the token as the X-CSRF-Token header for
// every state-changing request.
//
// In production the frontend and API live on different origins, so the
// cookie is set for the API origin and is NOT visible via document.cookie
// from the frontend page. We therefore prefer the token from the response
// body, falling back to the cookie only for same-origin (dev) setups.
// ------------------------------------------------------------------
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  // 1) Same-origin dev case: cookie is readable, avoid a network round-trip.
  const fromCookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("ms_sushant_csrf="));
  if (fromCookie) {
    csrfToken = decodeURIComponent(fromCookie.split("=")[1]);
    return csrfToken;
  }

  // 2) Fetch the token from the response body (works cross-origin).
  const res = await fetch(`${API_BASE}/csrf`, { credentials: "include" });
  if (!res.ok) throw new Error("Unable to initialize security token");
  const data = (await res.json()) as { token?: string };
  csrfToken = data.token ?? null;

  // 3) Last resort: read the cookie if the server set it readable.
  if (!csrfToken) {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("ms_sushant_csrf="));
    csrfToken = cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  }
  return csrfToken ?? "";
}

export class ApiRequestError extends Error {
  status: number;
  details?: { path: string; message: string }[];
  constructor(message: string, status: number, details?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { csrf = false }: { csrf?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  if (csrf) {
    const token = await getCsrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let data: ApiError | null = null;
    try {
      data = (await res.json()) as ApiError;
    } catch {
      data = null;
    }
    throw new ApiRequestError(
      data?.error ?? `Request failed with status ${res.status}`,
      res.status,
      data?.details
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ----------------------------- Public API ----------------------------
export const publicApi = {
  getProducts(params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; total: number; page: number; pages: number }> {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct(id: number): Promise<{ product: Product }> {
    return request(`/products/${id}`);
  },
  getCategories(): Promise<{ categories: Category[] }> {
    return request("/categories");
  },
  getSettings(): Promise<{ settings: SiteSettings }> {
    return request("/settings/public");
  },
  placeOrder(payload: {
    customerName: string;
    customerMobile: string;
    deliveryAddress: string;
    notes?: string;
    items: OrderItemInput[];
  }): Promise<{ message: string; order: { id: number; orderNumber: string; subtotal: number; status: string } }> {
    return request(
      "/orders",
      { method: "POST", body: JSON.stringify(payload) },
      { csrf: true }
    );
  },
  health(): Promise<{ status: string; service: string; time: string }> {
    return request("/health");
  },
};

// ----------------------------- Admin API -----------------------------
export interface AdminAuthUser {
  id: number;
  username: string;
  email: string | null;
  role: string;
}

export const adminApi = {
  login(username: string, password: string): Promise<{ admin: AdminAuthUser }> {
    return request(
      "/admin/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      { csrf: true }
    );
  },
  logout(): Promise<{ message: string }> {
    return request("/admin/auth/logout", { method: "POST" }, { csrf: true });
  },
  me(): Promise<{ admin: AdminAuthUser | null }> {
    return request("/admin/auth/me");
  },
  changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return request(
      "/admin/auth/change-password",
      { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) },
      { csrf: true }
    );
  },
  dashboard(): Promise<DashboardStats> {
    return request("/admin/dashboard");
  },
  getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }): Promise<{ products: Product[]; total: number; page: number; pages: number }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.categoryId) q.set("categoryId", String(params.categoryId));
    const qs = q.toString();
    return request(`/admin/products${qs ? `?${qs}` : ""}`);
  },
  createProduct(data: ProductPayload): Promise<{ product: Product }> {
    return request("/admin/products", { method: "POST", body: JSON.stringify(data) }, { csrf: true });
  },
  updateProduct(id: number, data: ProductPayload): Promise<{ product: Product }> {
    return request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }, { csrf: true });
  },
  deleteProduct(id: number): Promise<{ message: string }> {
    return request(`/admin/products/${id}`, { method: "DELETE" }, { csrf: true });
  },
  getCategories(): Promise<{ categories: Category[] }> {
    return request("/admin/categories");
  },
  createCategory(data: CategoryPayload): Promise<{ category: Category }> {
    return request("/admin/categories", { method: "POST", body: JSON.stringify(data) }, { csrf: true });
  },
  updateCategory(id: number, data: CategoryPayload): Promise<{ category: Category }> {
    return request(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }, { csrf: true });
  },
  deleteCategory(id: number): Promise<{ message: string }> {
    return request(`/admin/categories/${id}`, { method: "DELETE" }, { csrf: true });
  },
  getOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ orders: Order[]; total: number; page: number; pages: number }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    const qs = q.toString();
    return request(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
  updateOrderStatus(id: number, status: string): Promise<{ order: Order }> {
    return request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, { csrf: true });
  },
  getSettings(): Promise<{ settings: SiteSettings }> {
    return request("/admin/settings");
  },
  updateSettings(data: Partial<SiteSettings>): Promise<{ settings: SiteSettings }> {
    return request("/admin/settings", { method: "PUT", body: JSON.stringify(data) }, { csrf: true });
  },
  uploadImage(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    return request("/admin/uploads", { method: "POST", body: form }, { csrf: true });
  },
};

export interface ProductPayload {
  name: string;
  description?: string;
  unit: string;
  price: number;
  mrp: number;
  stock: number;
  isActive: boolean;
  categoryId: number;
  imageUrl?: string | null;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

