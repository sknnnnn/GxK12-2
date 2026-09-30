// Outfits: lectura pública de outfits vigentes y sus productos.
//
// Convención de GXK Core (ver ARCHITECTURE.md): recibe un GxkSupabaseClient
// ya construido. Usa solo RLS pública: outfits `published`, y filas de
// outfit_products cuyo producto está publicado y cuya variante (si tiene)
// está activa. No duplica productos: reutiliza los resúmenes de
// services/catalog. No incluye administración de outfits (Bloque 4).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { buildImageUrl, getPublishedProductsByIds, type CatalogProductSummary } from "@/services/catalog";

export type OutfitProduct = {
  product: CatalogProductSummary;
  /** Variante concreta fijada por el outfit, o null si referencia el producto completo. */
  variantId: string | null;
};

export type PublicOutfit = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** URL resuelta de la portada, o null si el outfit no tiene. */
  coverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  products: OutfitProduct[];
};

type OutfitRow = Pick<
  Tables<"outfits">,
  "id" | "slug" | "name" | "description" | "cover_image" | "starts_at" | "ends_at" | "sort_order" | "created_at"
>;
type OutfitProductRow = Pick<Tables<"outfit_products">, "outfit_id" | "product_id" | "variant_id" | "sort_order">;

/** Vigente = publicado (lo garantiza RLS) y `now` dentro de [starts_at, ends_at); fechas null = sin límite. */
export function isOutfitCurrent(outfit: Pick<OutfitRow, "starts_at" | "ends_at">, now: Date): boolean {
  const time = now.getTime();
  if (outfit.starts_at && Date.parse(outfit.starts_at) > time) return false;
  if (outfit.ends_at && Date.parse(outfit.ends_at) <= time) return false;
  return true;
}

// PENDIENTE DE CONFIRMAR: el esquema no documenta qué guarda `cover_image`
// (la Admin de outfits es del Bloque 4). Se acepta una URL absoluta tal cual
// o, si no lo es, una ruta del bucket público de imágenes de producto.
function resolveCoverUrl(supabase: GxkSupabaseClient, cover: string | null): string | null {
  if (!cover) return null;
  return /^https?:\/\//i.test(cover) ? cover : buildImageUrl(supabase, cover);
}

/**
 * Arma los outfits públicos. Orden: `sort_order` ascendente y, a igual
 * valor, el más reciente primero. Productos de cada outfit por su
 * `sort_order`. Un outfit sin ningún producto visible se omite (no hay nada
 * que mostrar); los productos no publicados ya no llegan por RLS.
 */
export function assembleOutfits(
  outfits: OutfitRow[],
  links: OutfitProductRow[],
  productsById: Map<string, CatalogProductSummary>,
  coverUrl: (cover: string | null) => string | null,
): PublicOutfit[] {
  const sorted = [...outfits].sort(
    (a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  const result: PublicOutfit[] = [];
  for (const outfit of sorted) {
    const products: OutfitProduct[] = links
      .filter((link) => link.outfit_id === outfit.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((link) => {
        const product = productsById.get(link.product_id);
        return product ? [{ product, variantId: link.variant_id }] : [];
      });
    if (products.length === 0) continue;

    result.push({
      id: outfit.id,
      slug: outfit.slug,
      name: outfit.name,
      description: outfit.description,
      coverImageUrl: coverUrl(outfit.cover_image),
      startsAt: outfit.starts_at,
      endsAt: outfit.ends_at,
      products,
    });
  }
  return result;
}

/**
 * Outfits publicados y vigentes a `now` (por defecto, ahora), con sus
 * productos. `limit` opcional recorta la lista ya ordenada. Devuelve `[]`
 * (estado vacío) si no hay ninguno.
 */
export async function getCurrentOutfits(
  supabase: GxkSupabaseClient,
  options?: { limit?: number; now?: Date },
): Promise<PublicOutfit[]> {
  const now = options?.now ?? new Date();

  const { data: outfitRows, error } = await supabase
    .from("outfits")
    .select("id, slug, name, description, cover_image, starts_at, ends_at, sort_order, created_at")
    .eq("status", "published")
    .returns<OutfitRow[]>();
  if (error) throw error;

  const current = (outfitRows ?? []).filter((outfit) => isOutfitCurrent(outfit, now));
  if (current.length === 0) return [];

  const { data: linkRows, error: linksError } = await supabase
    .from("outfit_products")
    .select("outfit_id, product_id, variant_id, sort_order")
    .in(
      "outfit_id",
      current.map((outfit) => outfit.id),
    )
    .returns<OutfitProductRow[]>();
  if (linksError) throw linksError;

  const links = linkRows ?? [];
  const products = await getPublishedProductsByIds(supabase, [...new Set(links.map((link) => link.product_id))]);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const outfits = assembleOutfits(current, links, productsById, (cover) => resolveCoverUrl(supabase, cover));
  const limit = options?.limit;
  return limit !== undefined && Number.isFinite(limit) && limit >= 0 ? outfits.slice(0, Math.floor(limit)) : outfits;
}
