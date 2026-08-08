import { API_BASE } from "../config";
import type {
  AdminProfile,
  ApiError,
  AssistantLanguage,
  Bill,
  ConstructionChatResponse,
  Category,
  CategoryReportRow,
  CustomerDetail,
  CustomerDue,
  CustomerDueReport,
  CustomerStatement,
  DashboardStats,
  Notification,
  Order,
OrderItemInput,
  OrderPayment,
  PaymentAnalytics,
  PaymentModeRow,
  Product,
  ProductHistory,
  ReportFilters,
  ReportType,
  SalesAnalytics,
  SalesReport,
  SiteSettings,
  TopCustomer,
  TopProduct,
  TrackedOrder,
  TrackedOrderSummary,
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
    cashAmount?: number;
    onlineAmount?: number;
    items: OrderItemInput[];
  }): Promise<{ message: string; order: { id: number; orderNumber: string; subtotal: number; status: string } }> {
    return request(
      "/orders",
      { method: "POST", body: JSON.stringify(payload) },
      { csrf: true }
    );
  },
  trackOrder(
    orderNumber: string,
    customerMobile: string
  ): Promise<{ order: TrackedOrder }> {
    const q = new URLSearchParams({ orderNumber, customerMobile });
    return request(`/orders/track?${q.toString()}`);
  },
  trackOrdersByMobile(
    customerMobile: string
  ): Promise<{ orders: TrackedOrderSummary[] }> {
    const q = new URLSearchParams({ customerMobile });
    return request(`/orders/track-by-mobile?${q.toString()}`);
  },
  health(): Promise<{ status: string; service: string; time: string }> {
    return request("/health");
  },
  constructionAssistantChat(payload: {
    message: string;
    sessionId?: string;
    language?: AssistantLanguage;
  }): Promise<ConstructionChatResponse> {
    const body: Record<string, string> = { message: payload.message };
    if (payload.sessionId) body.sessionId = payload.sessionId;
    if (payload.language) body.language = payload.language;
    return request(
      "/construction-assistant/chat",
      { method: "POST", body: JSON.stringify(body) },
      { csrf: true }
    );
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
  toggleProduct(id: number): Promise<{ product: Product }> {
    return request(`/admin/products/${id}/toggle`, { method: "PATCH" }, { csrf: true });
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
    from?: string;
    to?: string;
    payment?: string;
  }): Promise<{ orders: Order[]; total: number; page: number; pages: number }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.payment) q.set("payment", params.payment);
    const qs = q.toString();
    return request(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
updateOrderStatus(id: number, status: string): Promise<{ order: Order }> {
    return request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, { csrf: true });
  },
getDuesSummary(params: {
    search?: string;
    from?: string;
    to?: string;
    dateRange?: string;
    paymentStatus?: string;
  }): Promise<{ customers: CustomerDue[] }> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.dateRange) q.set("dateRange", params.dateRange);
    if (params.paymentStatus) q.set("paymentStatus", params.paymentStatus);
    const qs = q.toString();
    return request(`/admin/orders/due-snapshot${qs ? `?${qs}` : ""}`);
  },
  getCustomerDetail(mobile: string): Promise<CustomerDetail> {
    return request(`/admin/orders/customer/${encodeURIComponent(mobile)}`);
  },
  receiveCustomerPayment(
    mobile: string,
    amount: number,
    paymentMode: "CASH" | "ONLINE",
    paymentDate?: string,
    notes?: string
  ): Promise<{ message: string; payments: OrderPayment[]; customer: CustomerDetail["customer"]; orders: CustomerDetail["orders"] }> {
    return request(
      `/admin/orders/customer/${encodeURIComponent(mobile)}/payments`,
      { method: "POST", body: JSON.stringify({ amount, paymentMode, paymentDate, notes }) },
      { csrf: true }
    );
  },
  getOrder(id: number): Promise<{ order: Order; bill?: Bill | null }> {
    return request(`/admin/orders/${id}`);
  },
  editOrder(id: number, items: { productId: number; quantity: number }[]): Promise<{ order: Order }> {
    return request(`/admin/orders/${id}/edit`, { method: "PATCH", body: JSON.stringify({ items }) }, { csrf: true });
  },
  deleteOrder(id: number): Promise<{ success: boolean; message: string }> {
    return request(`/admin/orders/${id}`, { method: "DELETE" }, { csrf: true });
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
  getNotifications(limit = 20): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    return request(`/admin/notifications?limit=${limit}`);
  },
  markNotificationsRead(ids: number[]): Promise<{ ok: boolean; unreadCount: number }> {
    return request(
      "/admin/notifications/read",
      { method: "POST", body: JSON.stringify({ ids }) },
      { csrf: true }
    );
  },
  markAllNotificationsRead(): Promise<{ ok: boolean; unreadCount: number }> {
    return request(
      "/admin/notifications/read",
      { method: "POST", body: JSON.stringify({ all: true }) },
      { csrf: true }
    );
  },
  getProfile(): Promise<{ profile: AdminProfile }> {
    return request("/admin/profile");
  },
  updateProfile(data: { lowStockThreshold: number }): Promise<{ profile: AdminProfile }> {
    return request(
      "/admin/profile",
      { method: "PUT", body: JSON.stringify(data) },
      { csrf: true }
    );
  },
  updateProfileEmail(email: string | null): Promise<{ email: string | null }> {
    return request(
      "/admin/profile/email",
      { method: "PUT", body: JSON.stringify({ email }) },
      { csrf: true }
    );
  },
  getBill(orderId: number): Promise<{ bill: Bill | null }> {
    return request(`/admin/orders/${orderId}/bill`);
  },
  saveBill(orderId: number, discount: number): Promise<{ bill: Bill }> {
    return request(
      `/admin/orders/${orderId}/bill`,
      { method: "POST", body: JSON.stringify({ discount }) },
      { csrf: true }
    );
  },
  updateBill(orderId: number, discount: number): Promise<{ bill: Bill }> {
    return request(
      `/admin/orders/${orderId}/bill`,
      { method: "PUT", body: JSON.stringify({ discount }) },
      { csrf: true }
    );
  },
  receivePayment(
    orderId: number,
    amount: number,
    paymentMode: "CASH" | "ONLINE"
  ): Promise<{ message: string; payment: OrderPayment; order: Order }> {
    return request(
      `/admin/orders/${orderId}/payments`,
      { method: "POST", body: JSON.stringify({ amount, paymentMode }) },
      { csrf: true }
    );
  },
  forgotPassword(email: string): Promise<{ message: string }> {
    return request(
      "/admin/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
      { csrf: true }
    );
  },
  resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request(
      "/admin/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, newPassword }) },
      { csrf: true }
    );
  },
  getBillTextUrl(orderId: number): string {
    return `${API_BASE}/admin/orders/${orderId}/bill/text`;
  },
  getBillHtmlUrl(orderId: number): string {
    return `${API_BASE}/admin/orders/${orderId}/bill/html`;
  },
  // ------------------ Sales Reports ------------------
  getSalesReport(
    type: ReportType,
    params: {
      date?: string;
      from?: string;
      to?: string;
      month?: number;
      year?: number;
      filters?: ReportFilters;
    }
  ): Promise<{ report: SalesReport }> {
    const q = new URLSearchParams();
    q.set("type", type);
    if (params.date) q.set("date", params.date);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.month != null) q.set("month", String(params.month));
    if (params.year != null) q.set("year", String(params.year));
    const f = params.filters ?? {};
    if (f.customerName) q.set("customerName", f.customerName);
    if (f.phone) q.set("phone", f.phone);
    if (f.orderId) q.set("orderId", f.orderId);
    if (f.paymentType) q.set("paymentType", f.paymentType);
    if (f.status) q.set("status", f.status);
    if (f.productName) q.set("productName", f.productName);
    if (f.category) q.set("category", f.category);
    return request(`/admin/reports/data?${q.toString()}`);
  },
  getSalesReportExportUrl(
    type: ReportType,
    format: "excel" | "csv",
    params: {
      date?: string;
      from?: string;
      to?: string;
      month?: number;
      year?: number;
      filters?: ReportFilters;
    }
  ): string {
const q = new URLSearchParams();
    q.set("type", type);
    if (params.date) q.set("date", params.date);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.month != null) q.set("month", String(params.month));
    if (params.year != null) q.set("year", String(params.year));
    const f = params.filters ?? {};
    if (f.customerName) q.set("customerName", f.customerName);
    if (f.phone) q.set("phone", f.phone);
    if (f.orderId) q.set("orderId", f.orderId);
    if (f.paymentType) q.set("paymentType", f.paymentType);
    if (f.status) q.set("status", f.status);
    if (f.productName) q.set("productName", f.productName);
    if (f.category) q.set("category", f.category);
    const ext = format === "excel" ? "excel" : "csv";
    return `${API_BASE}/admin/reports/sales/export/${ext}?${q.toString()}`;
  },

  // ------------------ Phase 2 Analytics ------------------

  getAnalyticsOverview(): Promise<{ sales: SalesAnalytics; payments: PaymentAnalytics }> {
    return request("/admin/analytics/overview");
  },
  getTopCustomers(limit = 10): Promise<{
    byPurchase: TopCustomer[];
    byOrders: TopCustomer[];
    byAverageOrderValue: TopCustomer[];
    byDue: TopCustomer[];
  }> {
    return request(`/admin/analytics/top-customers?limit=${limit}`);
  },
  getTopProducts(): Promise<{
    topSelling: TopProduct[];
    lowestSelling: TopProduct[];
    mostOrdered: TopProduct[];
    highestRevenue: TopProduct[];
    leastRevenue: TopProduct[];
  }> {
    return request("/admin/analytics/top-products");
  },
  getCategoryReport(): Promise<{ categories: CategoryReportRow[] }> {
    return request("/admin/analytics/categories");
  },
  getPaymentModeReport(): Promise<{ totalRevenue: number; modes: PaymentModeRow[] }> {
    return request("/admin/analytics/payment-modes");
  },
  getChartData(kind: string, from?: string, to?: string): Promise<any> {
    const q = new URLSearchParams();
    q.set("kind", kind);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return request(`/admin/analytics/charts?${q.toString()}`);
  },
  getCustomerDueReport(params: {
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<CustomerDueReport> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request(`/admin/analytics/customer-due-report${qs ? `?${qs}` : ""}`);
  },
  getCustomerDueReportExportUrl(format: "csv" | "xlsx", params: { search?: string; from?: string; to?: string }): string {
    const q = new URLSearchParams();
    q.set("export", format);
    if (params.search) q.set("search", params.search);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    return `${API_BASE}/admin/analytics/customer-due-report?${q.toString()}`;
  },
  getCustomerStatement(mobile: string): Promise<CustomerStatement> {
    return request(`/admin/analytics/customer-statement/${encodeURIComponent(mobile)}`);
  },
  getProductHistory(id: number): Promise<ProductHistory> {
    return request(`/admin/analytics/product-history/${id}`);
  },
  getAnalyticsProducts(): Promise<{ products: { id: number; name: string; unit: string; category: { name: string } | null }[] }> {
    return request("/admin/analytics/products");
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
