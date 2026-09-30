"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelOrder, registerManualPayment, updateOrderStatus, type OrderStatus } from "@/services/admin";
import { sendOrderEmail, trackingUrlFor, type OrderEmailTemplate } from "@/services/emails";
import { ensureShipmentForPaidOrder } from "@/services/shipping/shipments";

// Mismo patrón que Productos/Inventario: form plano, feedback vía
// ?error=/?success= en la misma URL. Las reglas (transiciones, stock) viven
// en services/admin y en SQL; acá solo se traduce el resultado.

function back(orderId: string, query: string): never {
  redirect(`/admin/pedidos/${orderId}?${query}`);
}

// Los emails se registran en email_log (solo service_role puede escribirlo).
// Se envían DESPUÉS de que la operación del admin pasó por RLS con su sesión.
async function notify(orderId: string, template: OrderEmailTemplate) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("orders").select("order_number").eq("id", orderId).maybeSingle();
  if (!data) return;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  await sendOrderEmail(admin, { orderId, template, trackingUrl: trackingUrlFor(siteUrl, data.order_number) });
}

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus, formData: FormData): Promise<void> {
  void formData;
  const supabase = await createSupabaseServerClient();
  const result = await updateOrderStatus(supabase, orderId, newStatus);

  if (!result.ok) {
    const message =
      result.reason === "invalid_transition"
        ? "Esa transición de estado no es válida desde el estado actual del pedido."
        : "No se encontró el pedido o no tenés permisos para modificarlo.";
    back(orderId, `error=${encodeURIComponent(message)}`);
  }

  await notify(orderId, "order_status");
  back(orderId, "success=1");
}

export async function registerManualPaymentAction(orderId: string, formData: FormData): Promise<void> {
  const amount = Number(String(formData.get("amount") ?? "").trim().replace(",", "."));
  const supabase = await createSupabaseServerClient();
  const result = await registerManualPayment(supabase, orderId, amount);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_allowed: "No tenés permisos para registrar pagos.",
      invalid_amount: "El monto debe ser mayor a 0.",
      order_closed: "El pedido está cerrado (cancelado o reembolsado).",
      not_found: "No se encontró el pedido.",
    };
    back(orderId, `error=${encodeURIComponent(messages[result.reason])}`);
  }

  if (result.outcome === "confirmed") {
    await ensureShipmentForPaidOrder(supabase, orderId).catch((error) => console.error("[admin] envío post-pago:", error));
    await notify(orderId, "payment_confirmed");
  } else if (result.outcome === "stock_conflict") {
    await notify(orderId, "order_status");
    back(orderId, `error=${encodeURIComponent("Pago registrado, pero ya no hay stock: el pedido quedó en incidencia.")}`);
  }
  back(orderId, "success=pago");
}

export async function cancelOrderAction(orderId: string, formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const result = await cancelOrder(await createSupabaseServerClient(), orderId, reason);
  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_allowed: "No tenés permisos para cancelar pedidos.",
      invalid_transition: "Este pedido ya no se puede cancelar (despachado, entregado o cerrado).",
      not_found: "No se encontró el pedido.",
    };
    back(orderId, `error=${encodeURIComponent(messages[result.reason])}`);
  }
  await notify(orderId, "order_status");
  back(orderId, "success=cancelado");
}
