import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import type { ProductQuery } from "@/types/api";

export const PRODUCT_PAGE_SIZE = 12;
export type ProductListParams = Omit<ProductQuery, "page">;

export function useProducts(params: ProductListParams, enabled = true, perfLabel = "LIST_FIRST_PAGE") {
  const startedAt = useRef(Date.now());
  const query = useInfiniteQuery({
    queryKey: queryKeys.products.list(params),
    initialPageParam: 1,
    enabled,
    staleTime: 3 * 60 * 1000,
    queryFn: ({ pageParam, signal }) => publicApi.getProducts({ ...params, page: pageParam, limit: params.limit || PRODUCT_PAGE_SIZE }, signal),
    getNextPageParam: (lastPage) => lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
  });

  useEffect(() => {
    if (__DEV__ && query.data?.pages[0]) console.log(`[PRODUCT PERF] ${perfLabel}: ${Date.now() - startedAt.current}ms`);
  }, [perfLabel, query.data?.pages]);

  const products = query.data?.pages.flatMap((page) => page.products) || [];
  return { ...query, products, total: query.data?.pages[0]?.total ?? 0 };
}
