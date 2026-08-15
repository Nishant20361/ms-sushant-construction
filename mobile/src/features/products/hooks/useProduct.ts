import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/apiClient";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import type { Product } from "@/types/domain";
import type { ProductResponse, ProductsResponse } from "@/types/api";

function findProductInListData(data: unknown, id: number): Product | undefined {
  if (!data || typeof data !== "object") return undefined;
  if ("products" in data) return (data as ProductsResponse).products.find((product) => product.id === id);
  if ("pages" in data && Array.isArray((data as { pages: ProductsResponse[] }).pages)) {
    return (data as { pages: ProductsResponse[] }).pages.flatMap((page) => page.products).find((product) => product.id === id);
  }
  return undefined;
}

export function useProduct(id: number) {
  const queryClient = useQueryClient();
  const startedAt = useRef(Date.now());
  const placeholder = queryClient.getQueriesData({ queryKey: queryKeys.products.all }).map(([, data]) => findProductInListData(data, id)).find(Boolean);
  const query = useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => publicApi.getProductById(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 3 * 60 * 1000,
    placeholderData: placeholder ? { product: placeholder } satisfies ProductResponse : undefined,
  });
  useEffect(() => {
    if (__DEV__ && query.dataUpdatedAt) console.log(`[PRODUCT PERF] DETAIL: ${Date.now() - startedAt.current}ms`);
  }, [query.dataUpdatedAt]);
  return { ...query, product: query.data?.product, notFound: query.error instanceof ApiError && query.error.status === 404 };
}
