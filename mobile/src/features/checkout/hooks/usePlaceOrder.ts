import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError } from "@/services/apiClient";
import { publicApi } from "@/services/publicApi";
import type { CreateOrderPayload } from "@/types/api";

export type PlaceOrderFailureKind = "offline" | "uncertain" | "stock" | "unavailable" | "rate" | "validation" | "server";
export class PlaceOrderFailure extends Error { constructor(message: string, readonly kind: PlaceOrderFailureKind) { super(message); } }

function mapFailure(error: unknown): PlaceOrderFailure {
  if (error instanceof TimeoutError || error instanceof NetworkError) return new PlaceOrderFailure("We couldn't confirm the order yet. Check your connection and try again safely.", "uncertain");
  if (error instanceof ApiError) {
    if (error.status === 409) return new PlaceOrderFailure("Some items are no longer available in the requested quantity. Review your cart and try again.", "stock");
    if (error.status === 429) return new PlaceOrderFailure("Too many attempts. Please wait a little and try again.", "rate");
    if (error.status === 404) return new PlaceOrderFailure("One or more products are no longer available.", "unavailable");
    if (error.status === 400) {
      const unavailable = /stock|available|product|quantity/i.test(error.message);
      return new PlaceOrderFailure(unavailable ? error.message : "Please review your details and order quantities.", unavailable ? "unavailable" : "validation");
    }
  }
  return new PlaceOrderFailure("We couldn't place the order. Please try again.", "server");
}

export function usePlaceOrder() {
  return useMutation({
    retry: 0,
    mutationFn: async ({ payload, idempotencyKey }: { payload: CreateOrderPayload; idempotencyKey: string }) => {
      const network = await NetInfo.fetch();
      if (!network.isConnected || network.isInternetReachable === false) throw new PlaceOrderFailure("You're offline. Connect to the internet to place your order.", "offline");
      try { return await publicApi.createOrder(payload, idempotencyKey); } catch (error) { if (error instanceof PlaceOrderFailure) throw error; throw mapFailure(error); }
    },
  });
}
