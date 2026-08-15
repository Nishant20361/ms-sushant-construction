import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types/domain";
import { normalizeQuantity } from "@/utils/quantity";

interface CartState {
  items: CartItem[];
  hasHydrated: boolean;
  addItem(product: Product, quantity?: number): void;
  removeItem(productId: number): void;
  updateQuantity(productId: number, quantity: number): void;
  clearCart(): void;
  setHasHydrated(value: boolean): void;
}

const safeStorage = {
  getItem: async (name: string) => { try { const value = await AsyncStorage.getItem(name); if (value) JSON.parse(value); return value; } catch { await AsyncStorage.removeItem(name).catch(() => undefined); return null; } },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

export const useCartStore = create<CartState>()(persist((set) => ({
  items: [],
  hasHydrated: false,
  addItem: (product, quantity = 1) => set((state) => {
    const existing = state.items.find((item) => item.productId === product.id);
    const nextQuantity = normalizeQuantity((existing?.quantity || 0) + quantity, product.unit, product.stock);
    if (existing) return { items: state.items.map((item) => item.productId === product.id ? { ...item, quantity: nextQuantity, price: product.price, maxStock: product.stock } : item) };
    return { items: [...state.items, { productId: product.id, name: product.name, unit: product.unit, price: product.price, imageUrl: product.imageUrl, quantity: normalizeQuantity(quantity, product.unit, product.stock), maxStock: product.stock }] };
  }),
  removeItem: (productId) => set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
  updateQuantity: (productId, quantity) => set((state) => ({ items: state.items.map((item) => item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity, item.unit, item.maxStock) } : item) })),
  clearCart: () => set({ items: [] }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
}), {
  name: "ms-sushant-cart-v1",
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  partialize: (state) => ({ items: state.items }),
  merge: (persisted, current) => {
    const value = persisted as Partial<CartState> | undefined;
    return { ...current, items: Array.isArray(value?.items) ? value.items : [] };
  },
  onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
}));

export const selectCartCount = (state: CartState) => state.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state: CartState) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
