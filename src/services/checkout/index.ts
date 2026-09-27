// Checkout: revalidación completa previa a la creación del pedido (precio, stock, variante activa) y reserva de stock.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// Excepción deliberada: la creación real del pedido llama a la función SQL
// create_order_with_reservation (supabase/migrations/...), que solo
// service_role puede ejecutar. Quien invoque este servicio con fines de
// checkout real debe pasar un cliente construido con
// createSupabaseAdminClient (server-only, nunca en Desktop ni en el
// navegador) — no un cliente de sesión de usuario.

import { createHash, randomBytes } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { revalidateCartItems, type CartItemInput, type CartValidationIssue, type ValidatedCartLine } from "@/services/cart";
import type { PostgrestError } from "@supabase/supabase-js";

// Sin cuenta obligatoria (guest checkout): solo lo mínimo para poder
// contactar al comprador y despachar el pedido.
export type CheckoutCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CheckoutShippingInput = {
  address: string;
  locality: string;
  province: string;
  postalCode: string;
};

export type CheckoutInput = {
  items: CartItemInput[];
  customer: CheckoutCustomerInput;
  shipping: CheckoutShippingInput;
};

export type CheckoutFieldName = keyof CheckoutCustomerInput | keyof CheckoutShippingInput;

export type CheckoutIssue =
  | CartValidationIssue
  | { type: "missing_field"; field: CheckoutFieldName }
  | { type: "invalid_email" }
  // Carrera entre la revalidación previa y la reserva atómica en SQL: el
  // stock cambió justo en el medio (otro comprador se adelantó). No es un
  // error del pedido en sí, hay que reintentar con el carrito actualizado.
  | { type: "stock_changed" }
  | { type: "order_creation_failed"; message: string }
  // Payload con una forma inesperada (ver src/app/(storefront)/checkout/actions.ts):
  // el Server Action es un POST alcanzable directamente, no solo desde la UI.
  | { type: "malformed_request" };

export type CheckoutOrderSummary = {
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  lines: ValidatedCartLine[];
};

export type CheckoutResult = { ok: true; order: CheckoutOrderSummary } | { ok: false; issues: CheckoutIssue[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Duración de validez del token de consulta pública del pedido (no
// implementado todavía -- ver comentario de src/services/orders/index.ts).
// 30 días es un valor conservador solo para satisfacer la columna NOT NULL
// de orders; no hay UX construida sobre este valor en esta etapa.
const LOOKUP_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Costo y método de envío: deliberadamente sin definir todavía (Andreani /
// Correo Argentino, ver services/shipping). Se usa un placeholder explícito
// en vez de inventar una cotización -- create_order_with_reservation exige
// ambos valores (shipping_method NOT NULL, chk_order_total = subtotal +
// shipping_cost), así que no pueden quedar ausentes.
const SHIPPING_METHOD_PLACEHOLDER = "pending_definition";
const SHIPPING_COST_PLACEHOLDER = 0;

function validateBuyerInput(customer: CheckoutCustomerInput, shipping: CheckoutShippingInput): CheckoutIssue[] {
  const issues: CheckoutIssue[] = [];

  const requiredCustomerFields: Array<keyof CheckoutCustomerInput> = ["firstName", "lastName", "email", "phone"];
  for (const field of requiredCustomerFields) {
    if (!customer[field]?.trim()) issues.push({ type: "missing_field", field });
  }
  if (customer.email?.trim() && !EMAIL_PATTERN.test(customer.email.trim())) {
    issues.push({ type: "invalid_email" });
  }

  const requiredShippingFields: Array<keyof CheckoutShippingInput> = ["address", "locality", "province", "postalCode"];
  for (const field of requiredShippingFields) {
    if (!shipping[field]?.trim()) issues.push({ type: "missing_field", field });
  }

  return issues;
}

// create_order_with_reservation señaliza sus fallos con RAISE EXCEPTION de
// mensaje fijo (ver migración inicial). Si esto se dispara es porque la
// revalidación previa (revalidateCartItems) ya no refleja el estado real --
// una carrera con otro comprador entre la revalidación y esta llamada.
function mapRpcError(error: PostgrestError): CheckoutIssue {
  const message = error.message ?? "";
  if (message.startsWith("empty_order")) return { type: "empty_cart" };
  if (
    message.startsWith("insufficient_stock") ||
    message.startsWith("variant_not_found") ||
    message.startsWith("variant_inactive")
  ) {
    return { type: "stock_changed" };
  }
  return { type: "order_creation_failed", message };
}

/**
 * Checkout completo: revalida el carrito contra Supabase (nunca confía en
 * precio/nombre/stock del navegador), y si todo es válido crea el pedido +
 * reserva de stock invocando create_order_with_reservation. Atómico por
 * construcción: create_order_with_reservation no deja pedidos ni descuentos
 * de stock parciales ante ningún fallo (ver migración inicial).
 *
 * `supabase` debe ser un cliente admin (createSupabaseAdminClient):
 * create_order_with_reservation solo la puede ejecutar service_role.
 */
export async function submitCheckout(supabase: GxkSupabaseClient, input: CheckoutInput): Promise<CheckoutResult> {
  const buyerIssues = validateBuyerInput(input.customer, input.shipping);
  if (buyerIssues.length > 0) {
    return { ok: false, issues: buyerIssues };
  }

  const validation = await revalidateCartItems(supabase, input.items);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues };
  }

  const lookupToken = randomBytes(32).toString("hex");
  const lookupTokenHash = createHash("sha256").update(lookupToken).digest("hex");
  const lookupTokenExpiresAt = new Date(Date.now() + LOOKUP_TOKEN_TTL_MS).toISOString();

  const { data, error } = await supabase.rpc("create_order_with_reservation", {
    p_customer_name: `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim(),
    p_customer_email: input.customer.email.trim().toLowerCase(),
    p_customer_phone: input.customer.phone.trim(),
    p_items: validation.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
    p_shipping_method: SHIPPING_METHOD_PLACEHOLDER,
    p_shipping_address: {
      address: input.shipping.address.trim(),
      locality: input.shipping.locality.trim(),
      province: input.shipping.province.trim(),
      postalCode: input.shipping.postalCode.trim(),
    },
    p_shipping_cost: SHIPPING_COST_PLACEHOLDER,
    p_lookup_token_hash: lookupTokenHash,
    p_lookup_token_expires_at: lookupTokenExpiresAt,
  });

  if (error) {
    return { ok: false, issues: [mapRpcError(error)] };
  }

  return {
    ok: true,
    order: {
      orderNumber: data.order_number,
      subtotal: data.subtotal,
      shippingCost: data.shipping_cost,
      total: data.total,
      lines: validation.lines,
    },
  };
}
