// Checkout (Bible §32: máximo 4 pasos — Datos, Entrega, Pago, Confirmación).
// Compra sin cuenta: el registro en Familia GxK es opcional (Bible §23).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient ya construido. La creación real del pedido llama a la
// función SQL create_order, que solo service_role puede ejecutar: quien
// invoque submitCheckout debe pasar un cliente createSupabaseAdminClient
// (server-only, nunca en Desktop ni en el navegador).
//
// Stock (Bible §17): el carrito NO reserva y crear el pedido tampoco. Acá
// solo se verifica que lo pedido esté disponible hoy; el stock se descuenta
// cuando se confirma el primer pago (confirm_order_payment, ver migración
// block3_checkout_orders).

import { createHash, randomBytes } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { revalidateCartItems, type CartItemInput, type CartValidationIssue, type ValidatedCartLine } from "@/services/cart";
import {
  amountDueOnline,
  createOrderPayment,
  getPaymentSettings,
  isPaymentOptionId,
  paymentOptionsFor,
  type PaymentOptionId,
} from "@/services/payments";
import {
  availableDeliveryMethods,
  getDeliveryMethods,
  isCarrier,
  isDeliveryMethodId,
  type DeliveryMethodId,
} from "@/services/shipping/delivery";
import { sendOrderEmail, trackingUrlFor } from "@/services/emails";
import { recordAnalyticsEvents } from "@/services/analytics";
import type { PostgrestError } from "@supabase/supabase-js";

// Paso 1 — Datos.
export type CheckoutCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

// Paso 2 — Entrega. El domicilio usa la misma forma que exigen los
// transportistas para el alta del envío (ShippingPostalAddress).
export type CheckoutAddressInput = {
  streetName: string;
  streetNumber: string;
  floor: string;
  apartment: string;
  locality: string;
  province: string;
  postalCode: string;
};

export type CheckoutInput = {
  items: CartItemInput[];
  customer: CheckoutCustomerInput;
  deliveryMethod: string;
  /** Obligatorio solo para Andreani / Correo Argentino. */
  address: CheckoutAddressInput | null;
  // Paso 3 — Pago.
  paymentOption: string;
  /** NEXT_PUBLIC_SITE_URL sin barra final -- para armar las URLs de Mercado Pago y de seguimiento. */
  siteUrl: string;
  /** Familia GxK (Bloque 6): lo resuelve el servidor con la sesión, nunca el navegador. */
  isMember?: boolean;
  /** Beneficio del Camino G & K a aplicar (lo valida create_order). */
  caminoRewardId?: string | null;
  /** Analytics (Bible §36): sesión anónima y outfit de origen por variante. */
  attribution?: { sessionId: string; outfitByVariant: Record<string, string> } | null;
};

export type CheckoutFieldName = keyof CheckoutCustomerInput | keyof CheckoutAddressInput;

export type CheckoutIssue =
  | CartValidationIssue
  | { type: "missing_field"; field: CheckoutFieldName }
  | { type: "invalid_email" }
  | { type: "delivery_unavailable" }
  | { type: "payment_unavailable" }
  // El stock cambió entre la revalidación y la creación del pedido.
  | { type: "stock_changed" }
  // Producto en MEMBERS ONLY — 24H EARLY ACCESS y quien compra no es miembro.
  | { type: "members_only" }
  // El beneficio del Camino ya no se puede usar (o el email no es el de la cuenta).
  | { type: "reward_unavailable" }
  | { type: "order_creation_failed"; message: string }
  | { type: "malformed_request" };

export type CheckoutPaymentStatus =
  | { status: "redirect"; initPoint: string }
  // Efectivo en la entrega: no hay pago online, el admin lo registra.
  | { status: "cash" }
  // Mercado Pago sin credenciales o con error: el pedido existe igual.
  | { status: "unavailable"; reason: "not_configured" | "provider_error" };

export type CheckoutOrderSummary = {
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  amountDueOnline: number;
  balanceDue: number;
  lines: ValidatedCartLine[];
  /** Token en claro de consulta del pedido (solo lo tiene quien compró). */
  lookupToken: string;
  payment: CheckoutPaymentStatus;
};

export type CheckoutResult = { ok: true; order: CheckoutOrderSummary } | { ok: false; issues: CheckoutIssue[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validez del link de consulta del pedido (valor ya vigente en el sistema).
const LOOKUP_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const REQUIRED_ADDRESS_FIELDS: Array<keyof CheckoutAddressInput> = [
  "streetName",
  "streetNumber",
  "locality",
  "province",
  "postalCode",
];

export function validateCustomer(customer: CheckoutCustomerInput): CheckoutIssue[] {
  const issues: CheckoutIssue[] = [];
  for (const field of ["firstName", "lastName", "email", "phone"] as const) {
    if (!customer[field]?.trim()) issues.push({ type: "missing_field", field });
  }
  if (customer.email?.trim() && !EMAIL_PATTERN.test(customer.email.trim())) issues.push({ type: "invalid_email" });
  return issues;
}

export function validateAddress(address: CheckoutAddressInput | null): CheckoutIssue[] {
  return REQUIRED_ADDRESS_FIELDS.filter((field) => !address?.[field]?.trim()).map((field) => ({
    type: "missing_field" as const,
    field,
  }));
}

function mapRpcError(error: PostgrestError): CheckoutIssue {
  const message = error.message ?? "";
  if (message.startsWith("empty_order")) return { type: "empty_cart" };
  if (message.startsWith("members_only")) return { type: "members_only" };
  if (message.startsWith("reward_unavailable")) return { type: "reward_unavailable" };
  if (message.startsWith("insufficient_stock") || message.startsWith("variant_not_found") || message.startsWith("variant_inactive")) {
    return { type: "stock_changed" };
  }
  return { type: "order_creation_failed", message };
}

/** Opciones del checkout leídas server-side (pasos Entrega y Pago). */
export async function getCheckoutOptions(supabase: GxkSupabaseClient) {
  const [methods, paymentSettings] = await Promise.all([getDeliveryMethods(supabase), getPaymentSettings(supabase)]);
  const delivery = availableDeliveryMethods(methods);
  return {
    delivery,
    paymentOptionsByDelivery: Object.fromEntries(
      delivery.map((method) => [method.id, paymentOptionsFor(paymentSettings, method.id)]),
    ) as Record<DeliveryMethodId, ReturnType<typeof paymentOptionsFor>>,
  };
}

/**
 * Checkout completo: valida datos, entrega y pago contra la configuración
 * real (nada de costo/modalidad/medio viene decidido por el navegador),
 * revalida el carrito contra Supabase y crea el pedido con create_order.
 * Si corresponde, genera el pago de Mercado Pago por el monto de hoy.
 */
export async function submitCheckout(supabase: GxkSupabaseClient, input: CheckoutInput): Promise<CheckoutResult> {
  const issues = validateCustomer(input.customer);

  if (!isDeliveryMethodId(input.deliveryMethod)) {
    return { ok: false, issues: [...issues, { type: "delivery_unavailable" }] };
  }
  const deliveryId = input.deliveryMethod;
  if (isCarrier(deliveryId)) issues.push(...validateAddress(input.address));
  if (issues.length > 0) return { ok: false, issues };

  const [methods, paymentSettings] = await Promise.all([getDeliveryMethods(supabase), getPaymentSettings(supabase)]);
  const delivery = availableDeliveryMethods(methods).find((method) => method.id === deliveryId);
  if (!delivery) return { ok: false, issues: [{ type: "delivery_unavailable" }] };

  const option = isPaymentOptionId(input.paymentOption)
    ? paymentOptionsFor(paymentSettings, deliveryId).find((candidate) => candidate.id === (input.paymentOption as PaymentOptionId))
    : undefined;
  if (!option) return { ok: false, issues: [{ type: "payment_unavailable" }] };

  const validation = await revalidateCartItems(supabase, input.items);
  if (!validation.ok) return { ok: false, issues: validation.issues };

  const lookupToken = randomBytes(32).toString("hex");
  const lookupTokenHash = createHash("sha256").update(lookupToken).digest("hex");
  const lookupTokenExpiresAt = new Date(Date.now() + LOOKUP_TOKEN_TTL_MS).toISOString();

  const address = isCarrier(deliveryId) && input.address ? trimAddress(input.address) : {};

  const { data, error } = await supabase.rpc("create_order", {
    p_customer_name: `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`.trim(),
    p_customer_email: input.customer.email.trim().toLowerCase(),
    p_customer_phone: input.customer.phone.trim(),
    p_items: validation.lines.map((line) => ({ variant_id: line.variantId, quantity: line.quantity })),
    p_shipping_method: deliveryId,
    p_shipping_address: address,
    p_shipping_cost: delivery.cost,
    p_payment_method: option.paymentMethod,
    p_payment_plan: option.paymentPlan,
    p_meeting_point_details: deliveryId === "meeting_point" ? delivery.details : null,
    p_lookup_token_hash: lookupTokenHash,
    p_lookup_token_expires_at: lookupTokenExpiresAt,
    p_is_member: input.isMember === true,
    p_camino_reward_id: input.caminoRewardId ?? null,
  });

  if (error) return { ok: false, issues: [mapRpcError(error)] };

  const total = Number(data.total);
  const discount = Number(data.discount_amount ?? 0);
  const dueOnline = data.amount_due_online === null ? amountDueOnline(total, option) : Number(data.amount_due_online);

  let payment: CheckoutPaymentStatus = { status: "cash" };
  if (option.paymentMethod === "mercado_pago") {
    const items =
      option.paymentPlan === "deposit"
        ? [{ title: `Reserva 50% — pedido ${data.order_number}`, quantity: 1, unitPrice: dueOnline }]
        : discount > 0
          ? // Con beneficio del Camino, un único ítem por el total ya descontado.
            [{ title: `Pedido ${data.order_number}`, quantity: 1, unitPrice: dueOnline }]
          : [
            ...validation.lines.map((line) => ({
              title: [line.productName, line.variantLabel].filter(Boolean).join(" — "),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
            ...(Number(data.shipping_cost) > 0 ? [{ title: "Envío", quantity: 1, unitPrice: Number(data.shipping_cost) }] : []),
          ];
    const paymentResult = await createOrderPayment({
      orderNumber: data.order_number,
      items,
      siteUrl: input.siteUrl,
      lookupToken,
      maxInstallments: paymentSettings.maxInstallments,
    });
    if (!paymentResult.ok && paymentResult.reason === "provider_error") {
      console.error(`[checkout] Mercado Pago createPreference falló para ${data.order_number}:`, paymentResult.message);
    }
    payment = paymentResult.ok
      ? { status: "redirect", initPoint: paymentResult.initPoint }
      : { status: "unavailable", reason: paymentResult.reason };
  }

  if (input.attribution) {
    const attribution = input.attribution;
    await recordAnalyticsEvents(
      supabase,
      validation.lines.map((line) => ({
        event: "order_created" as const,
        sessionId: attribution.sessionId,
        orderId: data.id,
        productId: line.productId,
        outfitId: attribution.outfitByVariant[line.variantId] ?? null,
        quantity: line.quantity,
        value: line.unitPrice * line.quantity,
      })),
    ).catch((error) => console.error("[checkout] analytics order_created:", error));
  }

  await sendOrderEmail(supabase, {
    orderId: data.id,
    template: "order_created",
    trackingUrl: trackingUrlFor(input.siteUrl, data.order_number),
  });

  return {
    ok: true,
    order: {
      orderNumber: data.order_number,
      subtotal: Number(data.subtotal),
      shippingCost: Number(data.shipping_cost),
      discount,
      total,
      amountDueOnline: dueOnline,
      balanceDue: Number(data.balance_due),
      lines: validation.lines,
      lookupToken,
      payment,
    },
  };
}

function trimAddress(address: CheckoutAddressInput): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(address)) {
    if (typeof value === "string" && value.trim()) result[key] = value.trim();
  }
  return result;
}
