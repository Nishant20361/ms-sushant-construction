import { useCallback, useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types/domain";

export function useAddToCartFeedback() {
  const addItem = useCartStore((state) => state.addItem);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 1_700);
    return () => clearTimeout(timeout);
  }, [message]);
  const addProduct = useCallback((product: Product, quantity = 1) => {
      if (product.stock <= 0) return;
      addItem(product, quantity);
      setMessage(`${product.name} added to cart`);
  }, [addItem]);
  return { message, addProduct };
}
