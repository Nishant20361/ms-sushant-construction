import { create } from "zustand";
import type { CreateOrderResponse } from "@/types/api";

interface OrderFlowState {
  confirmedOrder?: CreateOrderResponse["order"];
  trackingMobile: string;
  setConfirmedOrder(order: CreateOrderResponse["order"], mobile: string): void;
  clearConfirmedOrder(): void;
}

export const useOrderFlowStore = create<OrderFlowState>((set) => ({
  trackingMobile: "",
  setConfirmedOrder: (confirmedOrder, trackingMobile) => set({ confirmedOrder, trackingMobile }),
  clearConfirmedOrder: () => set({ confirmedOrder: undefined, trackingMobile: "" }),
}));
