import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clampCartQuantity, parseCart } from "../lib/cart";
import type { CartItem, Product } from "../types";

const STORAGE_KEY = "ms_sushant_cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage may be unavailable (private mode); cart still works in memory
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (!product.isActive || !Number.isFinite(quantity) || quantity <= 0 || clampCartQuantity(quantity, product.unit, product.stock) <= 0) return;
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id
            ? { ...it, price: product.price, mrp: product.mrp, maxStock: product.stock, unit: product.unit, quantity: clampCartQuantity(it.quantity + quantity, product.unit, product.stock) }
            : it
        );
      }
      const item: CartItem = {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price: product.price,
        mrp: product.mrp,
        imageUrl: product.imageUrl,
        quantity: clampCartQuantity(quantity, product.unit, product.stock),
        maxStock: product.stock,
      };
      return [...prev, item];
    });
    // Do NOT automatically open the cart when adding items so customers
    // can continue adding multiple products uninterrupted.
    // The cart opens only when the user clicks the cart icon / View Cart.
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        if (!Number.isFinite(quantity)) return it;
        const q = clampCartQuantity(quantity, it.unit, it.maxStock);
        return { ...it, quantity: q };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { count, subtotal } = useMemo(() => {
    return {
      count: items.reduce((acc, it) => acc + it.quantity, 0),
      subtotal: items.reduce((acc, it) => acc + it.quantity * it.price, 0),
    };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
    }),
    [items, count, subtotal, isOpen, openCart, closeCart, addItem, removeItem, setQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

