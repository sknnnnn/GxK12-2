// Orders: creación y consulta de pedidos, snapshots históricos en order_items, consulta vía token seguro.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// La consulta pública de un pedido por token (lookup_token_hash) no se
// resuelve contra `orders` vía el cliente de sesión del comprador (no existe
// tal sesión): se hashea el token recibido y se consulta con un cliente
// admin server-only (createSupabaseAdminClient), devolviendo solo el
// subconjunto de campos apropiado -- nunca datos del cliente (customers) ni
// el hash/token en sí.

import { createHash } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";

export type OrderStatusLine = {
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
};

export type OrderStatusView = {
  orderNumber: string;
  /** Estado operativo del pedido (orders.status): pending_payment, payment_confirmed, etc. */
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  lines: OrderStatusLine[];
  /**
   * Estado del intento de pago más reciente (payments.status), si existe
   * alguno todavía -- puede no haber ninguno si el comprador todavía no
   * completó el checkout de Mercado Pago. Independiente de `status` a
   * propósito (ver services/payments y la tabla payments).
   */
  latestPaymentStatus: string | null;
};

type OrderItemRow = Pick<
  Tables<"order_items">,
  "product_name" | "variant_label" | "sku" | "unit_price" | "quantity" | "subtotal"
>;

type OrderRow = Pick<
  Tables<"orders">,
  "id" | "order_number" | "status" | "subtotal" | "shipping_cost" | "total" | "created_at" | "lookup_token_expires_at"
> & {
  order_items: OrderItemRow[];
};

/**
 * Busca un pedido por su token de consulta pública en claro (nunca el
 * hash): lo hashea, lo compara contra `lookup_token_hash` y devuelve un
 * subconjunto seguro para mostrarle al comprador (nombre/variante/cantidad
 * de cada línea, totales, estado del pedido y del último pago) -- nunca
 * datos de `customers` ni de `shipping_address`.
 *
 * Devuelve `null` tanto si el token no matchea ningún pedido como si
 * matchea uno pero venció (`lookup_token_expires_at` en el pasado): mismo
 * criterio de privacidad que getProductBySlug en services/catalog, no se
 * distingue "no existe" de "existe pero venció" desde afuera.
 */
export async function getOrderByLookupToken(
  supabase: GxkSupabaseClient,
  rawToken: string,
): Promise<OrderStatusView | null> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal, shipping_cost, total, created_at, lookup_token_expires_at, order_items ( product_name, variant_label, sku, unit_price, quantity, subtotal )",
    )
    .eq("lookup_token_hash", tokenHash)
    .maybeSingle()
    .returns<OrderRow>();

  if (error) throw error;
  if (!order) return null;
  if (order.lookup_token_expires_at && new Date(order.lookup_token_expires_at).getTime() < Date.now()) {
    return null;
  }

  const { data: latestPayment, error: paymentError } = await supabase
    .from("payments")
    .select("status")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) throw paymentError;

  return {
    orderNumber: order.order_number,
    status: order.status,
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    total: order.total,
    createdAt: order.created_at,
    lines: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variantLabel: item.variant_label,
      sku: item.sku,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineSubtotal: item.subtotal ?? item.unit_price * item.quantity,
    })),
    latestPaymentStatus: latestPayment?.status ?? null,
  };
}
