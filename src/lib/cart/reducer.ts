// Reducer puro del carrito (sin React): lo usa CartProvider y es testeable.
import type { CartLine, CartState } from "./types";

export type CartAction =
  | { type: "HYDRATE"; lines: CartLine[] }
  | { type: "ADD"; line: Omit<CartLine, "quantity">; quantity: number }
  | { type: "INCREMENT"; variantId: string }
  | { type: "DECREMENT"; variantId: string }
  | { type: "REMOVE"; variantId: string }
  // Cambiar talle/color de una línea (Bloque 3): conserva la cantidad; si la
  // variante nueva ya estaba en el carrito, se suman.
  | { type: "REPLACE_VARIANT"; fromVariantId: string; line: Omit<CartLine, "quantity"> }
  | { type: "CLEAR" };

export function cartReducer(state: CartState, action: CartAction): CartState {
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

    case "REPLACE_VARIANT": {
      const current = state.lines.find((line) => line.variantId === action.fromVariantId);
      if (!current || action.line.variantId === action.fromVariantId) return state;
      const rest = state.lines.filter((line) => line.variantId !== action.fromVariantId);
      const existing = rest.find((line) => line.variantId === action.line.variantId);
      if (existing) {
        return {
          lines: rest.map((line) =>
            line.variantId === action.line.variantId ? { ...line, quantity: line.quantity + current.quantity } : line,
          ),
        };
      }
      const index = state.lines.indexOf(current);
      const lines = [...rest];
      lines.splice(index, 0, { ...action.line, quantity: current.quantity });
      return { lines };
    }

    case "CLEAR":
      return { lines: [] };

    default:
      return state;
  }
}
