// Cart validation: revalidación server-side de producto, variante, precio y stock.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// El carrito en sí (estado, persistencia en el navegador) vive en
// src/lib/cart/** -- es un concepto de cliente/Storefront, no GXK Core (ver
// el comentario de cabecera de src/lib/cart/types.ts). Lo que sí es
// responsabilidad de esta capa server-side es revalidar ese carrito antes
// de dejarlo pasar a checkout.

/**
 * Forma mínima y NO confiable que el carrito del navegador le entrega al
 * servidor: solo variant_id + quantity. Nombre de producto, talle/color,
 * precio unitario e imagen que el carrito guarda son exclusivamente para
 * mostrar en la UI -- nunca se envían ni se confían como fuente de verdad
 * (ver src/lib/cart/types.ts CartLine).
 *
 * La función que revalida esto contra Supabase (producto publicado,
 * variante activa, precio real, stock real vía la vista
 * storefront_product_variants) y arma el payload para
 * create_order_with_reservation es la próxima etapa (checkout) --
 * deliberadamente no implementada todavía.
 */
export type CartItemInput = {
  variantId: string;
  quantity: number;
};
