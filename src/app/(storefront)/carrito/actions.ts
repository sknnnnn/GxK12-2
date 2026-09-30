"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductDetailsByIds, type CatalogProductDetail } from "@/services/catalog";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Datos públicos actuales de los productos del carrito (variantes con
 * disponibilidad y precio) para mostrar el resumen y editar talle/color.
 * Solo lectura pública (RLS): el checkout vuelve a validar todo.
 */
export async function loadCartProducts(productIds: unknown): Promise<CatalogProductDetail[]> {
  if (!Array.isArray(productIds)) return [];
  const ids = [...new Set(productIds.filter((id): id is string => typeof id === "string" && UUID.test(id)))].slice(0, 100);
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  return getProductDetailsByIds(supabase, ids);
}
