import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider, dehydrate, hydrate, type DehydratedState, type Query } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { queryClient } from "@/services/queryClient";

const CACHE_KEY = "ms-sushant-public-query-cache-v1";
const CACHE_BUSTER = "public-content-v3";
const MAX_AGE = 12 * 60 * 60 * 1000;
const CacheReadyContext = createContext(false);

interface PersistedCache { timestamp: number; buster: string; state: DehydratedState }

function createSafeQueryPredicate(): (query: Query) => boolean {
  const productQueries = queryClient.getQueryCache().findAll({ queryKey: ["products"] });
  const listHashes = new Set(productQueries.filter((query) => query.queryKey[1] === "list").sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt).slice(0, 4).map((query) => query.queryHash));
  const detailHashes = new Set(productQueries.filter((query) => query.queryKey[1] === "detail").sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt).slice(0, 10).map((query) => query.queryHash));
  return (query) => {
    if (query.state.status !== "success") return false;
    const [scope] = query.queryKey;
    if (scope === "settings" || scope === "categories") return true;
    return listHashes.has(query.queryHash) || detailHashes.has(query.queryHash);
  };
}

function CacheLifecycle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cache = JSON.parse(raw) as PersistedCache;
          if (cache.buster === CACHE_BUSTER && Date.now() - cache.timestamp <= MAX_AGE) hydrate(queryClient, cache.state);
          else await AsyncStorage.removeItem(CACHE_KEY);
        }
      } catch {
        await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
      } finally {
        if (active) setReady(true);
      }
    };

    void restore();
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (!active) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const cache: PersistedCache = { timestamp: Date.now(), buster: CACHE_BUSTER, state: dehydrate(queryClient, { shouldDehydrateQuery: createSafeQueryPredicate() }) };
        void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }, 1_000);
    });

    return () => { active = false; unsubscribe(); if (saveTimer) clearTimeout(saveTimer); };
  }, []);

  return <CacheReadyContext.Provider value={ready}>{children}</CacheReadyContext.Provider>;
}

export function PublicQueryCacheProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><CacheLifecycle>{children}</CacheLifecycle></QueryClientProvider>;
}

export const usePublicQueryCacheReady = () => useContext(CacheReadyContext);
