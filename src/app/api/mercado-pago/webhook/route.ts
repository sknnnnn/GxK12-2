import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPayment } from "@/lib/mercadopago/client";
import { recordPaymentResult, verifyWebhookSignature } from "@/services/payments";
import { ensureShipmentForPaidOrder } from "@/services/shipping/shipments";
import { sendOrderEmail, trackingUrlFor } from "@/services/emails";
import type { GxkSupabaseClient } from "@/lib/supabase/types";

// PRO-128: con el pago ya registrado como aprobado, se intenta dar de alta
// el envío. ensureShipmentForPaidOrder es idempotente (reintentos de este
// webhook no duplican envíos) y nunca toca payments/orders/stock. Cualquier
// fallo acá se loguea y NO cambia la respuesta: el pago ya quedó aplicado,
// y la incidencia se resuelve desde Admin > Envíos (reintento manual).
async function createShipmentAfterPayment(supabase: GxkSupabaseClient, orderId: string) {
  try {
    const shipment = await ensureShipmentForPaidOrder(supabase, orderId);
    if (
      !shipment.ok &&
      shipment.reason !== "already_exists" &&
      shipment.reason !== "in_progress" &&
      shipment.reason !== "not_a_carrier_order"
    ) {
      console.error(`[mercado-pago webhook] envío no creado para pedido ${orderId}: ${shipment.reason}`);
    }
  } catch (error) {
    console.error(`[mercado-pago webhook] error inesperado creando el envío del pedido ${orderId}:`, error);
  }
}

// Webhook de Mercado Pago (Checkout Pro). El retorno del navegador NUNCA es
// la fuente de verdad del estado de un pago (ver services/checkout y
// /checkout/retorno) -- esto es lo único que efectivamente confirma un
// pago: valida la firma (x-signature), vuelve a consultar el pago real
// contra la API de Mercado Pago (nunca confía en el payload del webhook en
// sí, que solo avisa "hay novedades") y recién ahí actualiza payments/orders
// de forma atómica (record_payment_result).
//
// Mercado Pago espera HTTP 200/201 dentro de ~22s o reintenta cada 15min
// (ver docs) -- por eso no hay ninguna cola/async detrás, todo se resuelve
// en el mismo request.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  // Mercado Pago puede notificar otros topics según la configuración de la
  // cuenta (merchant_order, etc.) -- los reconocemos sin procesarlos, para
  // que no se reintenten indefinidamente.
  if (type !== "payment") {
    return new Response(null, { status: 200 });
  }

  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secret no hay forma de validar la firma -- rechazar siempre,
    // nunca procesar una notificación sin validar (ver services/payments).
    // Esperado hasta que el dueño de GXK cargue MERCADO_PAGO_WEBHOOK_SECRET
    // en .env.local; no es un bug de este handler.
    console.error("[mercado-pago webhook] MERCADO_PAGO_WEBHOOK_SECRET no configurado; notificación rechazada.");
    return new Response(null, { status: 401 });
  }

  const signatureIsValid = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret,
  });

  if (!signatureIsValid) {
    return new Response(null, { status: 401 });
  }

  if (!dataId) {
    return new Response(null, { status: 200 });
  }

  try {
    const payment = await getPayment(dataId);
    const supabase = createSupabaseAdminClient();

    // Estado previo: permite reaccionar solo a la transición que produjo
    // ESTE aviso (Mercado Pago reintenta notificaciones).
    const before = payment.externalReference
      ? await supabase.from("orders").select("status").eq("order_number", payment.externalReference).maybeSingle()
      : null;
    const result = await recordPaymentResult(supabase, payment);

    if (!result.ok) {
      console.error(`[mercado-pago webhook] recordPaymentResult falló (${result.reason}) para payment ${dataId}`);
    } else if (payment.status === "approved") {
      // record_payment_result confirma el pago y compite por el stock
      // (primer pago confirmado gana, Bible §17): puede terminar confirmado
      // o en incidencia por falta de stock.
      const { data: after } = await supabase.from("orders").select("status, order_number").eq("id", result.orderId).maybeSingle();
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
      if (after && after.status !== before?.data?.status) {
        const trackingUrl = trackingUrlFor(siteUrl, after.order_number);
        if (after.status === "payment_confirmed") {
          await createShipmentAfterPayment(supabase, result.orderId);
          await sendOrderEmail(supabase, { orderId: result.orderId, template: "payment_confirmed", trackingUrl });
        } else if (after.status === "incidence") {
          console.error(`[mercado-pago webhook] pago aprobado sin stock para ${after.order_number}: incidencia (stock_conflict).`);
          await sendOrderEmail(supabase, { orderId: result.orderId, template: "order_status", trackingUrl });
        }
      } else if (after?.status === "payment_confirmed") {
        // Reintento: el alta del envío es idempotente y puede haber quedado pendiente.
        await createShipmentAfterPayment(supabase, result.orderId);
      }
    }
  } catch (error) {
    console.error("[mercado-pago webhook] error procesando notificación:", error);
    // 500 fuerza que Mercado Pago reintente más tarde -- preferible a
    // responder 200 y perder silenciosamente una actualización de pago.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
