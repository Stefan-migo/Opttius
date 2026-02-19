import { useCallback } from "react";
import type { POSProduct, POSCartItem } from "../types";

export interface UsePOSCartProps {
  cart: POSCartItem[];
  setCart: React.Dispatch<React.SetStateAction<POSCartItem[]>>;
}

export function usePOSCart({ cart, setCart }: UsePOSCartProps) {
  const addToCart = useCallback(
    (product: POSProduct) => {
      const existingItem = cart.find((item) => item.product.id === product.id);

      if (existingItem) {
        updateQuantity(product.id, existingItem.quantity + 1);
      } else {
        setCart((prev) => [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.price,
            subtotal: product.price,
            priceIncludesTax: product.price_includes_tax ?? true,
          },
        ]);
      }
    },
    [cart, setCart],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity,
                subtotal: item.unitPrice * quantity,
              }
            : item,
        ),
      );
    },
    [setCart],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    },
    [setCart],
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, [setCart]);

  return {
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
