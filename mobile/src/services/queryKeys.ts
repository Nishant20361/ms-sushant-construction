import type { ProductQuery } from "@/types/api";

export const queryKeys = {
  settings: ["settings"] as const,
  categories: ["categories"] as const,
  products: {
    all: ["products"] as const,
    list: (params: Omit<ProductQuery, "page">) => ["products", "list", params] as const,
    detail: (id: number) => ["products", "detail", id] as const,
  },
  trackedOrder: (orderNumber: string, mobile: string) => ["tracked-order", orderNumber, mobile] as const,
};
