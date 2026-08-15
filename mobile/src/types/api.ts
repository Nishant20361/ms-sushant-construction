import type { Category, Product, SiteSettings, TrackedOrder } from "./domain";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
export interface ProductQuery {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: ProductSort;
  inStock?: boolean;
}
export interface ProductsResponse { products: Product[]; total: number; page: number; pages: number }
export interface OrderItemInput { productId: number; quantity: number }
export interface CreateOrderPayload {
  customerName: string;
  customerMobile: string;
  deliveryAddress: string;
  notes?: string;
  items: OrderItemInput[];
}
export interface CreateOrderResponse {
  message: string;
  order: { id: number; orderNumber: string; customerName: string; subtotal: number; status: string; createdAt: string };
}
export interface TrackOrdersByMobileResponse {
  orders: Array<Pick<TrackedOrder, "orderNumber" | "status" | "createdAt" | "subtotal" | "customerName" | "items" | "bill"> & { id: number }>;
}
export type AssistantLanguage = "Hindi" | "English";
export interface AssistantRequest { message: string; sessionId?: string; language?: AssistantLanguage }
export interface AssistantResponse {
  reply: string;
  language: AssistantLanguage;
  sessionId: string;
  producedEstimate: boolean;
  suggestions?: string[];
  conversation?: { length?: number; width?: number; area?: number; floors?: number; totalArea?: number; quality?: string; location?: string };
}
export type SettingsResponse = { settings: SiteSettings };
export type CategoriesResponse = { categories: Category[] };
export type ProductResponse = { product: Product };
export type TrackOrderResponse = { order: TrackedOrder };
