// Catálogo base del admin: categorías (Bible §11), talles y colores (Bible
// §34). Con el cliente de sesión: RLS admin_all_* es la barrera real.

import type { GxkSupabaseClient } from "@/lib/supabase/types";

export type AdminCategory = { id: string; name: string; slug: string; sortOrder: number; isActive: boolean; productCount: number };
export type AdminSize = { id: string; name: string; sortOrder: number; isActive: boolean };
export type AdminColor = { id: string; name: string; slug: string; hexCode: string | null; isActive: boolean };

export async function getAdminCatalogBase(supabase: GxkSupabaseClient) {
  const [categoriesRes, sizesRes, colorsRes, productsRes] = await Promise.all([
    supabase.from("categories").select("id, name, slug, sort_order, is_active").order("sort_order").order("name"),
    supabase.from("sizes").select("id, name, sort_order, is_active").order("sort_order").order("name"),
    supabase.from("colors").select("id, name, slug, hex_code, is_active").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  for (const res of [categoriesRes, sizesRes, colorsRes, productsRes]) if (res.error) throw res.error;

  const countByCategory = new Map<string, number>();
  for (const row of productsRes.data ?? []) countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);

  return {
    categories: (categoriesRes.data ?? []).map(
      (row): AdminCategory => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        productCount: countByCategory.get(row.id) ?? 0,
      }),
    ),
    sizes: (sizesRes.data ?? []).map((row): AdminSize => ({ id: row.id, name: row.name, sortOrder: row.sort_order, isActive: row.is_active })),
    colors: (colorsRes.data ?? []).map(
      (row): AdminColor => ({ id: row.id, name: row.name, slug: row.slug, hexCode: row.hex_code, isActive: row.is_active }),
    ),
  };
}

export async function saveCategory(
  supabase: GxkSupabaseClient,
  id: string | null,
  input: { name: string; slug: string; sortOrder: number; isActive: boolean },
): Promise<void> {
  const values = { name: input.name, slug: input.slug, sort_order: input.sortOrder, is_active: input.isActive };
  const { error } = id ? await supabase.from("categories").update(values).eq("id", id) : await supabase.from("categories").insert(values);
  if (error) throw error;
}

export async function saveSize(
  supabase: GxkSupabaseClient,
  id: string | null,
  input: { name: string; sortOrder: number; isActive: boolean },
): Promise<void> {
  const values = { name: input.name, sort_order: input.sortOrder, is_active: input.isActive };
  const { error } = id ? await supabase.from("sizes").update(values).eq("id", id) : await supabase.from("sizes").insert(values);
  if (error) throw error;
}

export async function saveColor(
  supabase: GxkSupabaseClient,
  id: string | null,
  input: { name: string; slug: string; hexCode: string | null; isActive: boolean },
): Promise<void> {
  const values = { name: input.name, slug: input.slug, hex_code: input.hexCode, is_active: input.isActive };
  const { error } = id ? await supabase.from("colors").update(values).eq("id", id) : await supabase.from("colors").insert(values);
  if (error) throw error;
}
