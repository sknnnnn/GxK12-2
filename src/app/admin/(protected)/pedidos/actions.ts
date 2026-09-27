"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateOrderStatus, type OrderStatus } from "@/services/admin";

// Mismo patrón que Productos/Inventario: form plano sin JS, feedback vía
// ?error=/?success= en la misma URL. updateOrderStatus ya revalida la
// transición server-side contra el estado ACTUAL del pedido (no confía en
// lo que mande el formulario) -- acá solo se traduce su resultado a un
// mensaje.
export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus, formData: FormData): Promise<void> {
  void formData;

  const supabase = await createSupabaseServerClient();
  const result = await updateOrderStatus(supabase, orderId, newStatus);

  if (!result.ok) {
    const message =
      result.reason === "invalid_transition"
        ? "Esa transición de estado no es válida desde el estado actual del pedido."
        : "No se encontró el pedido o no tenés permisos para modificarlo.";
    redirect(`/admin/pedidos/${orderId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/pedidos/${orderId}?success=1`);
}
