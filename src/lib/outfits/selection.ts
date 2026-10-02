// Lógica pura de "agregar el outfit completo" (Bible §12): qué piezas están
// listas, cuáles requieren elegir talle/color y cuáles no están disponibles,
// y qué líneas de carrito resultan. Sin React ni Supabase: testeable aislada.

import type { CartLine } from "@/lib/cart/types";
import { cartLineFromVariant } from "@/lib/cart/lines";
import type { CatalogVariant } from "@/services/catalog";
import type { OutfitProduct } from "@/services/outfits";

export type PieceStatus =
  | { status: "ready"; variant: CatalogVariant }
  | { status: "needs-selection" }
  | { status: "unavailable" };

export function pieceKey(piece: OutfitProduct): string {
  return `${piece.product.id}:${piece.variantId ?? ""}`;
}

/**
 * Estado de una pieza. Con variante fijada por el outfit, esa es la única
 * válida (si no existe o no tiene stock, la pieza no está disponible). Sin
 * variante fijada, la elige la persona entre las reales del producto.
 * `selected` es la variante resuelta por VariantSelector (o null).
 */
export function resolvePiece(piece: OutfitProduct, selected: CatalogVariant | null): PieceStatus {
  if (piece.variantId) {
    const fixed = piece.product.variants.find((v) => v.id === piece.variantId);
    return fixed?.inStock ? { status: "ready", variant: fixed } : { status: "unavailable" };
  }
  if (!piece.product.variants.some((v) => v.inStock)) return { status: "unavailable" };
  if (!selected) return { status: "needs-selection" };
  return selected.inStock ? { status: "ready", variant: selected } : { status: "unavailable" };
}

export type OutfitSelectionResult = {
  /** true solo si TODAS las piezas están listas. */
  complete: boolean;
  /**
   * true si el outfit no está completo pero hay al menos una pieza lista: se
   * puede agregar parcialmente (las piezas agotadas o sin elegir quedan como
   * lugares vacíos).
   */
  partial: boolean;
  needsSelection: number;
  unavailable: number;
  /** Una línea por variante distinta (si dos piezas resuelven a la misma, se agrega una sola vez). */
  lines: Omit<CartLine, "quantity">[];
};

export function evaluateOutfit(
  pieces: OutfitProduct[],
  selections: Record<string, CatalogVariant | null>,
): OutfitSelectionResult {
  let needsSelection = 0;
  let unavailable = 0;
  const lines = new Map<string, Omit<CartLine, "quantity">>();

  for (const piece of pieces) {
    const state = resolvePiece(piece, selections[pieceKey(piece)] ?? null);
    if (state.status === "needs-selection") needsSelection++;
    else if (state.status === "unavailable") unavailable++;
    else if (!lines.has(state.variant.id)) lines.set(state.variant.id, cartLineFromVariant(piece.product, state.variant));
  }

  const complete = pieces.length > 0 && needsSelection === 0 && unavailable === 0;
  return {
    complete,
    partial: !complete && lines.size > 0,
    needsSelection,
    unavailable,
    lines: [...lines.values()],
  };
}
