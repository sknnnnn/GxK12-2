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

import type { GxkSupabaseClient } from "@/lib/supabase/types";

/**
 * Forma mínima y NO confiable que el carrito del navegador le entrega al
 * servidor: solo variant_id + quantity. Nombre de producto, talle/color,
 * precio unitario e imagen que el carrito guarda son exclusivamente para
 * mostrar en la UI -- nunca se envían ni se confían como fuente de verdad
 * (ver src/lib/cart/types.ts CartLine).
 */
export type CartItemInput = {
  variantId: string;
  quantity: number;
};

/**
 * Línea de carrito ya revalidada contra Supabase: todos los valores
 * (nombre, variante, precio, subtotal) son los reales de la base al momento
 * de la revalidación -- ninguno viene del navegador.
 */
export type ValidatedCartLine = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
};

/**
 * Motivos por los que una línea (o el carrito completo) no pasa la
 * revalidación server-side. `variant_not_found` cubre tanto una variante
 * inexistente como una inactiva o cuyo producto no está publicado --
 * mismo criterio de privacidad que services/catalog getProductBySlug: no
 * hay forma de distinguir desde el storefront "no existe" de "existe pero
 * no se puede comprar".
 */
export type CartValidationIssue =
  | { type: "empty_cart" }
  | { type: "invalid_quantity"; variantId: string }
  | { type: "variant_not_found"; variantId: string }
  | { type: "insufficient_stock"; variantId: string; available: number; requested: number };

export type CartValidationResult =
  | { ok: true; lines: ValidatedCartLine[]; subtotal: number }
  | { ok: false; issues: CartValidationIssue[] };

type VariantJoinRow = {
  id: string;
  product_id: string;
  sku: string | null;
  price_override: number | null;
  stock: number;
  products: { name: string; price: number; status: string };
  sizes: { name: string } | null;
  colors: { name: string } | null;
};

/**
 * Revalida un carrito contra Supabase antes de dejarlo pasar a checkout:
 * cantidades válidas, variante existente/activa/de producto publicado, y
 * stock real suficiente. Devuelve nombre, variante y precio reales
 * (nunca los que mandó el navegador) y el subtotal calculado en base a
 * ellos.
 *
 * Requiere un cliente con privilegios de service-role
 * (createSupabaseAdminClient): product_variants no tiene policy de lectura
 * pública (ver migración inicial), a propósito -- el público solo puede
 * leer stock real (no booleano) a través de este camino server-only.
 */
export async function revalidateCartItems(
  supabase: GxkSupabaseClient,
  rawItems: CartItemInput[],
): Promise<CartValidationResult> {
  if (rawItems.length === 0) {
    return { ok: false, issues: [{ type: "empty_cart" }] };
  }

  const invalidQuantityIssues: CartValidationIssue[] = rawItems
    .filter((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)
    .map((item) => ({ type: "invalid_quantity", variantId: item.variantId }));

  if (invalidQuantityIssues.length > 0) {
    return { ok: false, issues: invalidQuantityIssues };
  }

  // Mismo variant_id repetido en el carrito (CartProvider.ADD ya lo evita,
  // pero un cliente no confiable podría mandarlo igual): se suman las
  // cantidades antes de chequear stock, para que no se pueda eludir el
  // control de stock partiendo un mismo pedido en varias líneas de la
  // misma variante.
  const quantityByVariant = new Map<string, number>();
  for (const item of rawItems) {
    quantityByVariant.set(item.variantId, (quantityByVariant.get(item.variantId) ?? 0) + item.quantity);
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, price_override, stock, products!inner(name, price, status), sizes(name), colors(name)")
    .in("id", [...quantityByVariant.keys()])
    .eq("is_active", true)
    .eq("products.status", "published")
    .returns<VariantJoinRow[]>();

  if (error) throw error;

  const rowById = new Map((data ?? []).map((row) => [row.id, row]));
  const issues: CartValidationIssue[] = [];
  const lines: ValidatedCartLine[] = [];

  for (const [variantId, quantity] of quantityByVariant) {
    const row = rowById.get(variantId);
    if (!row) {
      issues.push({ type: "variant_not_found", variantId });
      continue;
    }
    if (row.stock < quantity) {
      issues.push({ type: "insufficient_stock", variantId, available: row.stock, requested: quantity });
      continue;
    }

    const unitPrice = row.price_override ?? row.products.price;
    const variantLabel = [row.sizes?.name, row.colors?.name].filter(Boolean).join(" / ") || null;

    lines.push({
      variantId,
      productId: row.product_id,
      productName: row.products.name,
      variantLabel,
      sku: row.sku,
      unitPrice,
      quantity,
      lineSubtotal: unitPrice * quantity,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  return { ok: true, lines, subtotal };
}
