// Payments: creación del pago (Checkout Pro), validación de webhook y
// actualización de estado.
// Proveedor: Mercado Pago.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// Excepción deliberada (a diferencia de catalog/cart/checkout): este módulo
// SÍ importa directamente src/lib/mercadopago/client.ts en vez de recibirlo
// inyectado. A diferencia del cliente Supabase (que cambia según quién
// llama: anon, sesión o service-role), el acceso a Mercado Pago tiene un
// único construction path legítimo siempre -- MERCADO_PAGO_ACCESS_TOKEN
// server-only, sin variantes por caller -- inventar una abstracción
// inyectable para eso sería complejidad sin beneficio real. El módulo de
// lib/ lleva su propio guard `server-only`, que protege transitivamente a
// quien lo importe.
//
// El estado de `payments` solo debe cambiar a partir de un webhook validado
// (nunca por edición manual desde Admin Web o Desktop): la policy RLS
// admin_read_payments es de solo lectura a propósito, y solo service_role
// puede escribir. El handler del webhook usa createSupabaseAdminClient.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import {
  createPreference,
  MercadoPagoNotConfiguredError,
  type MercadoPagoPayment,
} from "@/lib/mercadopago/client";

// ----------------------------------------------------------------------------
// Creación de la preference (Checkout Pro) para un pedido ya creado.
// ----------------------------------------------------------------------------

export type CreateOrderPaymentInput = {
  orderNumber: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  /** NEXT_PUBLIC_SITE_URL, sin barra final -- para armar back_urls/notification_url absolutas. */
  siteUrl: string;
  /** Token en claro de src/services/checkout (nunca el hash) -- ver services/orders.getOrderByLookupToken. */
  lookupToken: string;
};

export type CreateOrderPaymentResult =
  | { ok: true; initPoint: string }
  // "not_configured": MERCADO_PAGO_ACCESS_TOKEN vacío -- estado esperado
  // hasta que el dueño de GXK cargue sus credenciales en .env.local, no un
  // bug. El pedido ya fue creado y reservado igual (ver services/checkout);
  // esto solo bloquea el paso de pago.
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "provider_error"; message: string };

export async function createOrderPayment(input: CreateOrderPaymentInput): Promise<CreateOrderPaymentResult> {
  const returnUrl = `${input.siteUrl}/checkout/retorno?token=${encodeURIComponent(input.lookupToken)}`;

  try {
    const preference = await createPreference({
      items: input.items.map((item) => ({ title: item.title, quantity: item.quantity, unitPrice: item.unitPrice })),
      externalReference: input.orderNumber,
      backUrls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
      notificationUrl: `${input.siteUrl}/api/mercado-pago/webhook`,
    });
    return { ok: true, initPoint: preference.initPoint };
  } catch (error) {
    if (error instanceof MercadoPagoNotConfiguredError) {
      return { ok: false, reason: "not_configured" };
    }
    return { ok: false, reason: "provider_error", message: error instanceof Error ? error.message : String(error) };
  }
}

// ----------------------------------------------------------------------------
// Validación de la firma del webhook (header x-signature).
//
// Formato documentado por Mercado Pago: x-signature = "ts=<ms>,v1=<hmac-hex>".
// El manifest a firmar es "id:<data.id>;request-id:<x-request-id>;ts:<ts>;",
// HMAC-SHA256 contra MERCADO_PAGO_WEBHOOK_SECRET, comparado en tiempo
// constante. Si esto no matchea, el request NO viene de Mercado Pago -- se
// descarta sin tocar ninguna tabla ni volver a consultar la API.
// ----------------------------------------------------------------------------

export type WebhookSignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
};

export function verifyWebhookSignature(input: WebhookSignatureInput): boolean {
  if (!input.xSignature || !input.xRequestId || !input.dataId || !input.secret) return false;

  const parts = new Map<string, string>();
  for (const part of input.xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts.set(key.trim(), value.trim());
  }

  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;

  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
  const expectedHex = createHmac("sha256", input.secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const actualBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

// ----------------------------------------------------------------------------
// Aplica el resultado de un pago YA VERIFICADO (firma validada + GET real a
// la API de Mercado Pago -- nunca el payload del webhook en sí) a payments +
// orders, vía la función SQL record_payment_result (atómica, idempotente).
// ----------------------------------------------------------------------------

// Debe coincidir exactamente con el CHECK de payments.status (ver migración
// mercado_pago_payment_support): refleja 1:1 los status reales de la API de
// Mercado Pago. Un status fuera de este set es o un typo nuestro o un
// status nuevo que Mercado Pago todavía no documentaba cuando se escribió
// esto -- en ambos casos, mejor rechazar explícitamente que insertar algo
// que el CHECK de la base va a rechazar de todas formas con un error menos
// claro.
const KNOWN_PAYMENT_STATUSES = new Set([
  "pending",
  "authorized",
  "in_process",
  "in_mediation",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
]);

export type RecordPaymentResultResult =
  // orderId: para que quien llama (webhook) pueda disparar la etapa
  // siguiente -- ej. services/shipping/shipments.ensureShipmentForPaidOrder.
  | { ok: true; orderId: string }
  | { ok: false; reason: "missing_external_reference" | "unknown_status" | "order_not_found" };

export async function recordPaymentResult(
  supabase: GxkSupabaseClient,
  payment: MercadoPagoPayment,
): Promise<RecordPaymentResultResult> {
  if (!payment.externalReference) {
    return { ok: false, reason: "missing_external_reference" };
  }
  if (!KNOWN_PAYMENT_STATUSES.has(payment.status)) {
    return { ok: false, reason: "unknown_status" };
  }

  const { data, error } = await supabase.rpc("record_payment_result", {
    p_order_number: payment.externalReference,
    p_provider: "mercado_pago",
    p_external_id: payment.id,
    p_status: payment.status,
    p_amount: payment.amount,
    p_currency: payment.currency,
    p_raw_reference: payment.raw,
  });

  if (error) {
    if (error.message?.startsWith("order_not_found")) {
      return { ok: false, reason: "order_not_found" };
    }
    throw error;
  }

  return { ok: true, orderId: data.order_id };
}
