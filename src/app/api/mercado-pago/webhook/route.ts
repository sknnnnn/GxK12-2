import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPayment } from "@/lib/mercadopago/client";
import { recordPaymentResult, verifyWebhookSignature } from "@/services/payments";

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
    const result = await recordPaymentResult(supabase, payment);

    if (!result.ok) {
      console.error(`[mercado-pago webhook] recordPaymentResult falló (${result.reason}) para payment ${dataId}`);
    }
  } catch (error) {
    console.error("[mercado-pago webhook] error procesando notificación:", error);
    // 500 fuerza que Mercado Pago reintente más tarde -- preferible a
    // responder 200 y perder silenciosamente una actualización de pago.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
