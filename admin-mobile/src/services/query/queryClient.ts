import { QueryClient } from "@tanstack/react-query";
import { AdminAppError } from "@/types/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry(failureCount, error) {
        if (error instanceof AdminAppError && ["unauthorized", "forbidden", "validation", "not_found"].includes(error.kind)) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
