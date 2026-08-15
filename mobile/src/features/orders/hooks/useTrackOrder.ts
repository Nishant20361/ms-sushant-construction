import { useMutation } from "@tanstack/react-query";
import { ApiError, NetworkError, TimeoutError } from "@/services/apiClient";
import { publicApi } from "@/services/publicApi";
export function useTrackOrder() { return useMutation({ retry: 0, mutationFn: ({ orderNumber, mobile }: { orderNumber: string; mobile: string }) => publicApi.trackOrder(orderNumber, mobile) }); }
export function trackingErrorMessage(error: unknown): string { if (error instanceof ApiError && error.status === 404) return "We couldn't find an order matching those details."; if (error instanceof ApiError && error.status === 429) return "Too many attempts. Please wait a little and try again."; if (error instanceof TimeoutError || error instanceof NetworkError) return "We couldn't reach the server. Check your connection and try again."; return "We couldn't track this order right now. Please try again."; }
