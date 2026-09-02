import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/constants/queryKeys";
import { financeService } from "./financeService";
import type {
  ChangePinPayload,
  DueFilters,
  PaymentPayload,
  ResetPinPayload,
} from "./types";

export const useDueSnapshot = (f: DueFilters, enabled = true) =>
  useQuery({
    queryKey: adminQueryKeys.dueSnapshot(f),
    queryFn: ({ signal }) => financeService.snapshot(f, signal),
    enabled,
  });

export const useCustomerDue = (mobile: string, enabled = true) =>
  useQuery({
    queryKey: adminQueryKeys.dueCustomer(mobile),
    queryFn: ({ signal }) => financeService.customer(mobile, signal),
    enabled: !!mobile && enabled,
  });

export const useBill = (id: number) =>
  useQuery({
    queryKey: adminQueryKeys.bill(id),
    queryFn: ({ signal }) => financeService.bill(id, signal),
    enabled: id > 0,
  });

export const useBillingOrders = (search: string) =>
  useInfiniteQuery({
    queryKey: [...adminQueryKeys.billing(), "picker", search],
    queryFn: ({ pageParam, signal }) => financeService.orders(search, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (x) => (x.page < x.pages ? x.page + 1 : undefined),
  });

export const useKhatabookAuthStatus = () =>
  useQuery({
    queryKey: adminQueryKeys.khatabookAuth(),
    queryFn: ({ signal }) => financeService.authStatus(signal),
  });

export const useKhatabookStock = (enabled = true) =>
  useQuery({
    queryKey: adminQueryKeys.khatabookStock(),
    queryFn: ({ signal }) => financeService.stockProducts(signal),
    enabled,
  });

export const useKhatabookProfit = (enabled = true) =>
  useQuery({
    queryKey: adminQueryKeys.khatabookProfit(),
    queryFn: ({ signal }) => financeService.profitAnalytics(signal),
    enabled,
  });

export function useFinanceMutations() {
  const q = useQueryClient();
  const refresh = () =>
    Promise.all([
      q.invalidateQueries({ queryKey: adminQueryKeys.dues() }),
      q.invalidateQueries({ queryKey: adminQueryKeys.orders() }),
      q.invalidateQueries({ queryKey: adminQueryKeys.billing() }),
      q.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      q.refetchQueries({ queryKey: adminQueryKeys.dues() }),
      q.refetchQueries({ queryKey: adminQueryKeys.dashboard() }),
      q.refetchQueries({ queryKey: adminQueryKeys.orders() }),
    ]);

  return {
    customerPayment: useMutation({
      mutationFn: ({ mobile, p }: { mobile: string; p: PaymentPayload }) =>
        financeService.customerPayment(mobile, p),
      onSuccess: refresh,
    }),
    orderPayment: useMutation({
      mutationFn: ({ id, p }: { id: number; p: PaymentPayload }) =>
        financeService.orderPayment(id, p),
      onSuccess: refresh,
    }),
    bill: useMutation({
      mutationFn: ({ id, discount, exists }: { id: number; discount: number; exists: boolean }) =>
        financeService.saveBill(id, discount, exists),
      onSuccess: refresh,
    }),
    verifyPin: useMutation({
      mutationFn: (pin: string) => financeService.verifyPin(pin),
    }),
    changePin: useMutation({
      mutationFn: (payload: ChangePinPayload) => financeService.changePin(payload),
      onSuccess: () => q.invalidateQueries({ queryKey: adminQueryKeys.khatabookAuth() }),
    }),
    forgotPin: useMutation({
      mutationFn: () => financeService.forgotPin(),
    }),
    resetPin: useMutation({
      mutationFn: (payload: ResetPinPayload) => financeService.resetPin(payload),
      onSuccess: () => q.invalidateQueries({ queryKey: adminQueryKeys.khatabookAuth() }),
    }),
  };
}
