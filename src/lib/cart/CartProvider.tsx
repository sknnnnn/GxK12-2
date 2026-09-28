"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { CartLine, CartState } from "./types";
import { loadCart, saveCart } from "./storage";

type CartAction =
  | { type: "HYDRATE"; lines: CartLine[] }
  | { type: "ADD"; line: Omit<CartLine, "quantity">; quantity: number }
  | { type: "INCREMENT"; variantId: string }
  | { type: "DECREMENT"; variantId: string }
  | { type: "REMOVE"; variantId: string }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { lines: action.lines };

    case "ADD": {
      // Cantidad siempre entera y > 0 -- nunca se permite agregar 0 o negativo.
      const quantity = Math.max(1, Math.floor(action.quantity));
      const existingIndex = state.lines.findIndex((line) => line.variantId === action.line.variantId);
      if (existingIndex === -1) {
        return { lines: [...state.lines, { ...action.line, quantity }] };
      }
      // Ya está en el carrito: suma cantidad a la línea existente en vez de duplicarla.
      return {
        lines: state.lines.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + quantity } : line,
        ),
      };
    }

    case "INCREMENT":
      return {
        lines: state.lines.map((line) =>
          line.variantId === action.variantId ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      };

    case "DECREMENT":
      // Decrementar por debajo de 1 elimina la línea -- nunca queda una
      // cantidad <= 0 persistida.
      return {
        lines: state.lines
          .map((line) => (line.variantId === action.variantId ? { ...line, quantity: line.quantity - 1 } : line))
          .filter((line) => line.quantity > 0),
      };

    case "REMOVE":
      return { lines: state.lines.filter((line) => line.variantId !== action.variantId) };

    case "CLEAR":
      return { lines: [] };

    default:
      return state;
  }
}

// `hydrated`: ya se leyó localStorage (ver CartProvider). Vive en el mismo
// reducer para que la carga y la marca de "hidratado" sean un único dispatch.
function hydratingCartReducer(state: CartState & { hydrated: boolean }, action: CartAction) {
  if (action.type === "HYDRATE") return { lines: action.lines, hydrated: true };
  return { ...cartReducer(state, action), hydrated: state.hydrated };
}

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Fuente de verdad del carrito para todo el Storefront. Se monta una sola
 * vez en src/app/(storefront)/layout.tsx -- Admin Web no lo necesita y no
 * lo monta.
 *
 * Hidrata desde localStorage después del mount (evita desajustes de
 * SSR/hidratación: el primer render, server y cliente, siempre arranca con
 * el carrito vacío) y persiste automáticamente cada cambio.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(hydratingCartReducer, { lines: [], hydrated: false });

  useEffect(() => {
    dispatch({ type: "HYDRATE", lines: loadCart() });
  }, []);

  // No se persiste nada hasta haber hidratado: si no, el primer render
  // (carrito vacío) pisa localStorage con []. En producción el load corre
  // antes y no se nota, pero con StrictMode (next dev) el efecto de carga se
  // vuelve a ejecutar DESPUÉS de ese save y vaciaba el carrito en cada recarga.
  useEffect(() => {
    if (state.hydrated) saveCart(state.lines);
  }, [state.hydrated, state.lines]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = state.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      lines: state.lines,
      itemCount,
      subtotal,
      addItem: (line, quantity = 1) => dispatch({ type: "ADD", line, quantity }),
      increment: (variantId) => dispatch({ type: "INCREMENT", variantId }),
      decrement: (variantId) => dispatch({ type: "DECREMENT", variantId }),
      remove: (variantId) => dispatch({ type: "REMOVE", variantId }),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [state.lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de <CartProvider> (ver src/app/(storefront)/layout.tsx)");
  }
  return context;
}
