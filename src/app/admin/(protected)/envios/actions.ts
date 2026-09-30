"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureShipmentForPaidOrder, type EnsureShipmentResult } from "@/services/shipping/shipments";

function describeResult(result: EnsureShipmentResult): string | null {
  if (result.ok) return null;
  switch (result.reason) {
    case "order_not_found":
      return "No se encontró el pedido o no tenés permisos para operar sobre él.";
    case "order_not_paid":
      return "El pedido no tiene el pago confirmado: no se crea el envío.";
    case "provider_not_configured":
      return "El pedido no tiene un transportista válido.";
    case "not_a_carrier_order":
      return "Es un pedido con punto de encuentro: no lleva envío por transportista.";
    case "already_exists":
      return "El pedido ya tiene un envío dado de alta.";
    case "in_progress":
      return "Ya hay un intento de alta en curso para este pedido.";
    case "failed":
      return `El proveedor no pudo dar de alta el envío: ${result.error}`;
  }
}

// Reintento manual de una incidencia de envío. Misma función idempotente
// que usa el webhook de pagos (services/shipping/shipments.ts), con el
// cliente de SESIÓN: RLS limita todo a admins activos. Nunca toca pago ni
// stock. `returnTo` solo admite rutas internas de Admin.
export async function retryShipmentAction(orderId: string, returnTo: string, formData: FormData): Promise<void> {
  void formData;
  const target = returnTo.startsWith("/admin/") ? returnTo : "/admin/envios";

  const supabase = await createSupabaseServerClient();
  const message = describeResult(await ensureShipmentForPaidOrder(supabase, orderId));

  redirect(message ? `${target}?error=${encodeURIComponent(message)}` : `${target}?success=envio`);
}
