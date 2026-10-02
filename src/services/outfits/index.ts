// Outfits: lectura pública de outfits vigentes y sus productos.
//
// Convención de GXK Core (ver ARCHITECTURE.md): recibe un GxkSupabaseClient
// ya construido. Usa solo RLS pública: outfits `published`, y filas de
// outfit_products cuyo producto está publicado y cuya variante (si tiene)
// está activa. No duplica productos: reutiliza el detalle de
// services/catalog (getProductDetailsByIds). No incluye administración de outfits (Bloque 4).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { buildImageUrl, getProductDetailsByIds, type CatalogProductDetail } from "@/services/catalog";

export type OutfitProduct = {
  /** Detalle con variantes: permite elegir talle/color y agregar la pieza al carrito. */
  product: CatalogProductDetail;
  /** Variante concreta fijada por el outfit, o null si referencia el producto completo. */
  variantId: string | null;
};

export type PublicOutfit = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Estilo (Bible §12: street, formal, japanese, y2k, workwear) o null. */
  style: string | null;
  /** URL resuelta de la portada, o null si el outfit no tiene. */
  coverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  products: OutfitProduct[];
  /**
   * Historias donde aparece el outfit (recorrido central, Bible §39: outfit →
   * campaña → G/K → aventura): entradas del Universo con página y capítulos
   * de G & K publicados.
   */
  stories: OutfitStory[];
};

export type OutfitStory = { label: string; title: string; href: string };

type OutfitRow = Pick<
  Tables<"outfits">,
  "id" | "slug" | "name" | "description" | "cover_image" | "starts_at" | "ends_at" | "sort_order" | "created_at"
> & { style?: string | null };
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
  productsById: Map<string, CatalogProductDetail>,
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
      style: outfit.style ?? null,
      coverImageUrl: coverUrl(outfit.cover_image),
      startsAt: outfit.starts_at,
      endsAt: outfit.ends_at,
      products,
      stories: [],
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
  options?: { limit?: number; now?: Date; ids?: string[]; style?: string },
): Promise<PublicOutfit[]> {
  const now = options?.now ?? new Date();
  if (options?.ids && options.ids.length === 0) return [];

  let query = supabase
    .from("outfits")
    .select("id, slug, name, description, style, cover_image, starts_at, ends_at, sort_order, created_at")
    .eq("status", "published");
  if (options?.ids) query = query.in("id", options.ids);
  if (options?.style) query = query.eq("style", options.style);
  const { data: outfitRows, error } = await query.returns<OutfitRow[]>();
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
  const products = await getProductDetailsByIds(supabase, [...new Set(links.map((link) => link.product_id))]);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const outfits = assembleOutfits(current, links, productsById, (cover) => resolveCoverUrl(supabase, cover));
  const stories = await getOutfitStories(
    supabase,
    outfits.map((outfit) => outfit.id),
  );
  for (const outfit of outfits) outfit.stories = stories.get(outfit.id) ?? [];
  const limit = options?.limit;
  return limit !== undefined && Number.isFinite(limit) && limit >= 0 ? outfits.slice(0, Math.floor(limit)) : outfits;
}

const STORY_KIND_LABELS: Record<string, string> = {
  campaign: "Campaña",
  production: "Producción",
  season: "Temporada",
  collaboration: "Colaboración",
  audiovisual: "Audiovisual",
};

/** Historias publicadas (con página) que incluyen cada outfit. RLS + filtro explícito de publicado. */
async function getOutfitStories(supabase: GxkSupabaseClient, outfitIds: string[]): Promise<Map<string, OutfitStory[]>> {
  const result = new Map<string, OutfitStory[]>();
  if (outfitIds.length === 0) return result;
  const [entriesRes, chaptersRes] = await Promise.all([
    supabase
      .from("universe_entry_outfits")
      .select("outfit_id, universe_entries!inner ( kind, title, slug, status, has_page, published_at )")
      .in("outfit_id", outfitIds)
      .eq("universe_entries.status", "published")
      .eq("universe_entries.has_page", true)
      .lte("universe_entries.published_at", new Date().toISOString())
      .returns<{ outfit_id: string; universe_entries: { kind: string; title: string; slug: string } }[]>(),
    supabase
      .from("adventure_chapter_outfits")
      .select("outfit_id, chapter_id")
      .in("outfit_id", outfitIds),
  ]);
  if (entriesRes.error) throw entriesRes.error;
  if (chaptersRes.error) throw chaptersRes.error;
  const add = (outfitId: string, story: OutfitStory) => result.set(outfitId, [...(result.get(outfitId) ?? []), story]);
  for (const row of entriesRes.data ?? []) {
    const entry = row.universe_entries;
    add(row.outfit_id, { label: STORY_KIND_LABELS[entry.kind] ?? entry.kind, title: entry.title, href: `/universo/${entry.slug}` });
  }
  const chapterLinks = chaptersRes.data ?? [];
  if (chapterLinks.length > 0) {
    const { data: chapters, error } = await supabase
      .from("adventure_chapters")
      .select("id, label, title, slug, adventure_seasons!inner ( slug, status )")
      .in("id", [...new Set(chapterLinks.map((link) => link.chapter_id))])
      .eq("status", "published")
      .eq("adventure_seasons.status", "published")
      .returns<{ id: string; label: string; title: string | null; slug: string; adventure_seasons: { slug: string } }[]>();
    if (error) throw error;
    const byId = new Map((chapters ?? []).map((chapter) => [chapter.id, chapter]));
    for (const link of chapterLinks) {
      const chapter = byId.get(link.chapter_id);
      if (!chapter) continue;
      add(link.outfit_id, {
        label: "Las Aventuras de G & K",
        title: `${chapter.label}${chapter.title ? ` ${chapter.title}` : ""}`,
        href: `/universo/aventuras/${chapter.adventure_seasons.slug}/${chapter.slug}`,
      });
    }
  }
  return result;
}

/**
 * Outfits vigentes que incluyen un producto ("descubrir outfit" desde el
 * producto, Bible §39). Liviano: solo nombre y ancla en Home (no hay página
 * de outfit; OUTFITS vive en /#outfits).
 */
export async function getOutfitsForProduct(
  supabase: GxkSupabaseClient,
  productId: string,
  now: Date = new Date(),
): Promise<{ name: string; href: string }[]> {
  const { data: links, error } = await supabase.from("outfit_products").select("outfit_id").eq("product_id", productId);
  if (error) throw error;
  const ids = [...new Set((links ?? []).map((link) => link.outfit_id))];
  if (ids.length === 0) return [];
  const { data: outfits, error: outfitsError } = await supabase
    .from("outfits")
    .select("id, slug, name, starts_at, ends_at, sort_order")
    .in("id", ids)
    .eq("status", "published")
    .order("sort_order");
  if (outfitsError) throw outfitsError;
  return (outfits ?? [])
    .filter((outfit) => isOutfitCurrent(outfit, now))
    .map((outfit) => ({ name: outfit.name, href: `/#outfit-${outfit.slug}` }));
}
