import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatINR, resolveImageUrl } from "../lib/format";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, setQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-black/40" onClick={closeCart} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
          <button onClick={closeCart} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close cart">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl">🛒</div>
            <p className="text-slate-600">Your cart is empty</p>
            <button onClick={closeCart} className="btn-primary">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((it) => (
                  <li key={it.productId} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {it.imageUrl ? (
                        <img
                          src={resolveImageUrl(it.imageUrl) ?? ""}
                          alt={it.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">🧱</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{it.name}</p>
                          <p className="text-xs text-slate-500">{it.unit}</p>
                        </div>
                        <button
                          onClick={() => removeItem(it.productId)}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-slate-300">
                          <button
                            onClick={() => setQuantity(it.productId, it.quantity - 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                          <button
                            onClick={() => setQuantity(it.productId, it.quantity + 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{formatINR(it.price * it.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-200 px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Subtotal</span>
                <span className="text-lg font-bold text-slate-900">{formatINR(subtotal)}</span>
              </div>
              <button
                onClick={() => {
                  closeCart();
                  navigate("/checkout");
                }}
                className="btn-primary w-full"
              >
                Proceed to Checkout
              </button>
              <button onClick={closeCart} className="btn-secondary mt-2 w-full">
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

