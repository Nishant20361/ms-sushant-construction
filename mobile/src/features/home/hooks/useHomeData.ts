import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import { usePublicQueryCacheReady } from "@/components/PublicQueryCacheProvider";

const HOME_PRODUCT_PARAMS = { limit: 8, sort: "newest" } as const;

export function useHomeData() {
  const startedAt = useRef(Date.now());
  const cacheReady = usePublicQueryCacheReady();
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => publicApi.getSettings(signal),
    staleTime: 30 * 60 * 1000,
    enabled: cacheReady,
  });
  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: ({ signal }) => publicApi.getCategories(signal),
    staleTime: 30 * 60 * 1000,
    enabled: cacheReady,
  });
  const products = useQuery({
    queryKey: queryKeys.products.list(HOME_PRODUCT_PARAMS),
    queryFn: ({ signal }) => publicApi.getProducts({ ...HOME_PRODUCT_PARAMS, page: 1 }, signal),
    staleTime: 5 * 60 * 1000,
    enabled: cacheReady,
  });

  useEffect(() => {
    if (__DEV__) console.log("[HOME PERF] SHELL_RENDERED");
  }, []);
  useEffect(() => {
    if (__DEV__ && settings.dataUpdatedAt) console.log(`[HOME PERF] SETTINGS_RECEIVED: ${Date.now() - startedAt.current}ms`);
  }, [settings.dataUpdatedAt]);
  useEffect(() => {
    if (__DEV__ && categories.dataUpdatedAt) console.log(`[HOME PERF] CATEGORIES_RECEIVED: ${Date.now() - startedAt.current}ms`);
  }, [categories.dataUpdatedAt]);
  useEffect(() => {
    if (__DEV__ && products.dataUpdatedAt) console.log(`[HOME PERF] PRODUCTS_RECEIVED: ${Date.now() - startedAt.current}ms`);
  }, [products.dataUpdatedAt]);

  return {
    settings,
    categories,
    products,
    isRefreshing: settings.isRefetching || categories.isRefetching || products.isRefetching,
    refreshAll: () => {
      void settings.refetch();
      void categories.refetch();
      void products.refetch();
    },
  };
}
