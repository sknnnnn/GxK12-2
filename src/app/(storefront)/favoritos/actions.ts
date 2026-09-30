"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductSummariesByIds, type CatalogProductSummary } from "@/services/catalog";

const MAX_FAVORITES = 200;

/** Resúmenes de los favoritos guardados (solo productos publicados). */
export async function loadFavoriteProducts(ids: unknown): Promise<CatalogProductSummary[]> {
  if (!Array.isArray(ids)) return [];
  const clean = ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, MAX_FAVORITES);
  const supabase = await createSupabaseServerClient();
  const products = await getProductSummariesByIds(supabase, clean);
  const order = new Map(clean.map((id, index) => [id, index]));
  return products.sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0));
}
