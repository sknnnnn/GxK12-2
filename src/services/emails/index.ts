// Emails transaccionales del pedido. Nunca interrumpen un flujo: si falla o
// no hay proveedor, queda registrado en email_log y se sigue.
//
// Convención de GXK Core: recibe el GxkSupabaseClient (service-role en
// checkout/webhook; sesión de admin en Admin Web, que puede leer el pedido
// por RLS pero no escribir email_log -> en ese caso el registro se omite).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/lib/orders/status";
import { getEmailProvider, type EmailMessage, type EmailProvider } from "./provider";

export type { EmailMessage, EmailProvider } from "./provider";

export type OrderEmailTemplate = "order_created" | "payment_confirmed" | "order_status";

export type OrderEmailData = {
  customerName: string;
  orderNumber: string;
  status: string;
  total: number;
  amountDueOnline: number | null;
  balanceDue: number;
  paymentMethod: string;
  paymentPlan: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingUrl: string;
};

/** Pura: arma asunto y texto. Voz directa, sin copy comercial (Bible §9-§10). */
export function renderOrderEmail(template: OrderEmailTemplate, data: OrderEmailData): Omit<EmailMessage, "to"> {
  const lines = [`Hola ${data.customerName},`, ""];
  let subject: string;

  if (template === "order_created") {
    subject = `Recibimos tu pedido ${data.orderNumber}`;
    lines.push(`Recibimos tu pedido ${data.orderNumber}. Total: ${formatPrice(data.total)}.`);
    if (data.paymentMethod === "cash") {
      lines.push(`Pagás ${formatPrice(data.total)} en efectivo en la entrega. El pedido se confirma cuando se registra el pago.`);
    } else if (data.paymentPlan === "deposit") {
      lines.push(
        `Pagás ${formatPrice(data.amountDueOnline ?? 0)} ahora por Mercado Pago y ${formatPrice(data.balanceDue)} en la entrega. El pedido se confirma cuando se acredita el pago.`,
      );
    } else {
      lines.push("El pedido se confirma cuando se acredita el pago.");
    }
  } else if (template === "payment_confirmed") {
    subject = `Pago confirmado — pedido ${data.orderNumber}`;
    lines.push(`Confirmamos el pago de tu pedido ${data.orderNumber}.`);
    if (data.balanceDue > 0) lines.push(`Saldo a pagar en la entrega: ${formatPrice(data.balanceDue)}.`);
  } else {
    subject = `Tu pedido ${data.orderNumber}: ${orderStatusLabel(data.status)}`;
    lines.push(`Tu pedido ${data.orderNumber} está en estado: ${orderStatusLabel(data.status)}.`);
    if (data.status === "shipped" && data.trackingNumber) {
      lines.push(`Número de seguimiento${data.carrier ? ` (${data.carrier})` : ""}: ${data.trackingNumber}.`);
    }
    if (data.status === "incidence") lines.push("Te vamos a contactar para resolverlo.");
  }

  lines.push("", `Seguimiento: ${data.trackingUrl}`, "", "GXK 12:2");
  return { subject, text: lines.join("\n") };
}

const CARRIER_LABELS: Record<string, string> = { andreani: "Andreani", correo_argentino: "Correo Argentino" };

type OrderForEmail = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  amount_due_online: number | null;
  balance_due: number;
  payment_method: string;
  payment_plan: string;
  customers: { name: string; email: string } | null;
};

export type SendOrderEmailResult = "sent" | "skipped" | "failed";

/**
 * Envía (o registra como omitido) un email del pedido. `trackingUrl` es la
 * URL pública de seguimiento. Nunca lanza.
 */
export async function sendOrderEmail(
  supabase: GxkSupabaseClient,
  input: { orderId: string; template: OrderEmailTemplate; trackingUrl: string },
  deps: { provider?: EmailProvider | null } = {},
): Promise<SendOrderEmailResult> {
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, amount_due_online, balance_due, payment_method, payment_plan, customers ( name, email )")
      .eq("id", input.orderId)
      .maybeSingle()
      .returns<OrderForEmail>();
    if (error) throw error;
    if (!order?.customers?.email) return "skipped";

    const { data: shipment } = await supabase
      .from("shipments")
      .select("provider, tracking_number")
      .eq("order_id", input.orderId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const message = renderOrderEmail(input.template, {
      customerName: order.customers.name,
      orderNumber: order.order_number,
      status: order.status,
      total: Number(order.total),
      amountDueOnline: order.amount_due_online === null ? null : Number(order.amount_due_online),
      balanceDue: Number(order.balance_due),
      paymentMethod: order.payment_method,
      paymentPlan: order.payment_plan,
      trackingNumber: shipment?.tracking_number ?? null,
      carrier: shipment ? (CARRIER_LABELS[shipment.provider] ?? shipment.provider) : null,
      trackingUrl: input.trackingUrl,
    });

    const provider = deps.provider === undefined ? getEmailProvider() : deps.provider;
    let status: SendOrderEmailResult = "skipped";
    let errorText: string | null = provider ? null : "EMAIL_PROVIDER no configurado";
    if (provider) {
      try {
        await provider.send({ to: order.customers.email, ...message });
        status = "sent";
      } catch (sendError) {
        status = "failed";
        errorText = sendError instanceof Error ? sendError.message.slice(0, 500) : String(sendError).slice(0, 500);
      }
    }

    const { error: logError } = await supabase.from("email_log").insert({
      order_id: order.id,
      template: input.template,
      recipient: order.customers.email,
      provider: provider?.id ?? "none",
      status,
      error: errorText,
    });
    if (logError) console.error("[emails] no se pudo registrar el email:", logError.message);
    return status;
  } catch (error) {
    console.error(`[emails] ${input.template} para ${input.orderId} falló:`, error);
    return "failed";
  }
}

export function trackingUrlFor(siteUrl: string, orderNumber: string): string {
  return `${siteUrl}/seguimiento?pedido=${encodeURIComponent(orderNumber)}`;
}
