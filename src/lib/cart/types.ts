// Carrito: estado client-side, persistido en el navegador (localStorage).
//
// Storefront-only a propósito -- no vive en src/services/** (GXK Core):
// el carrito es un concepto puramente de cliente/navegador, no una
// operación server-side reutilizable entre Admin Web y Desktop (ver
// ARCHITECTURE.md). No requiere Supabase para leerse/escribirse.
//
// Cada línea es una snapshot liviana de la variante al momento de
// agregarla -- igual en espíritu a cómo order_items conserva un snapshot
// histórico, aunque acá es temporal y solo vive en el navegador. NUNCA se
// confía en unitPrice/inStock de esta snapshot como fuente de verdad para
// cobrar: eso lo revalida el servidor en checkout (ver
// src/services/cart/index.ts CartItemInput).
export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
};

export type CartState = {
  lines: CartLine[];
};
