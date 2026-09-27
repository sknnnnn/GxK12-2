"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateVariantStock } from "@/services/admin";

// Mismo patrón que src/app/admin/(protected)/productos/actions.ts: form
// plano sin JS, feedback vía ?error=/?success= en la misma URL. Corre con
// el cliente de SESIÓN del admin (RLS admin_all_variants ya permite el
// UPDATE) -- no hay ni hace falta service-role acá.

function parseStock(formData: FormData): { stock: number } | { error: string } {
  const raw = String(formData.get("stock") ?? "").trim();

  // Regex en vez de solo Number(): rechaza explícitamente decimales, signos
  // y cualquier cosa no numérica, no solo confía en type="number" del
  // input (que es apenas una ayuda de UI, no una validación real).
  if (!/^\d+$/.test(raw)) {
    return { error: "El stock debe ser un número entero mayor o igual a 0." };
  }

  return { stock: Number(raw) };
}

export async function updateStockAction(variantId: string, formData: FormData): Promise<void> {
  // Query string de la vista actual (filtros/búsqueda/orden) sin error/success
  // de una edición anterior -- ver src/app/admin/(protected)/inventario/page.tsx.
  const returnQuery = String(formData.get("returnQuery") ?? "");
  const params = new URLSearchParams(returnQuery);

  const parsed = parseStock(formData);
  if ("error" in parsed) {
    params.set("error", parsed.error);
    redirect(`/admin/inventario?${params.toString()}`);
  }

  const supabase = await createSupabaseServerClient();
  try {
    await updateVariantStock(supabase, variantId, parsed.stock);
  } catch {
    params.set("error", "No se pudo actualizar el stock.");
    redirect(`/admin/inventario?${params.toString()}`);
  }

  params.set("success", "1");
  redirect(`/admin/inventario?${params.toString()}`);
}
