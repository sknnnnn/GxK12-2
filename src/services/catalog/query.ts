// Búsqueda, filtros y orden del catálogo (Bloque 2). Lógica pura: sin
// Supabase ni Next.js, testeable aislada. La usa services/catalog getCatalog.
//
// Filtros definidos por la Bible §11: talle, color, precio, disponibilidad.
// Categorías de navegación (Bible §11): NUEVO, las categorías reales que
// cargue el admin, VER TODO. NUEVO no es una categoría de la base: es el
// mismo conjunto que "Nuevos ingresos" de Home (los más recientes).

import type { CatalogColor, CatalogProductSummary, CatalogSize } from "./index";

/** Slug reservado de la categoría virtual NUEVO (Bible §11). */
export const NEW_CATEGORY_SLUG = "nuevo";

export const CATALOG_SORTS = ["nuevo", "precio_asc", "precio_desc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  nuevo: "Más nuevos",
  precio_asc: "Precio: menor a mayor",
  precio_desc: "Precio: mayor a menor",
};

export type CatalogQuery = {
  /** Slug de categoría activa, o NEW_CATEGORY_SLUG. Vacío = VER TODO. */
  category?: string;
  search?: string;
  sizeIds?: string[];
  colorIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: CatalogSort;
};

export type CatalogVariantFacet = { sizeId: string | null; colorId: string | null; inStock: boolean };

export type CatalogListItem = CatalogProductSummary & {
  description: string | null;
  createdAt: string;
  variants: CatalogVariantFacet[];
};

export type ApplyCatalogOptions = {
  /** Talles activos en el orden del catálogo. */
  sizes: CatalogSize[];
  colors: CatalogColor[];
  /** Tamaño del conjunto NUEVO. Sin valor, NUEVO = todo ordenado por más nuevo. */
  newestLimit?: number;
};

/** Minúsculas y sin acentos: "Buzo Ñandú" y "buzo nandu" matchean. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function variantMatches(variant: CatalogVariantFacet, query: CatalogQuery): boolean {
  if (query.sizeIds?.length && (!variant.sizeId || !query.sizeIds.includes(variant.sizeId))) return false;
  if (query.colorIds?.length && (!variant.colorId || !query.colorIds.includes(variant.colorId))) return false;
  if (query.inStockOnly && !variant.inStock) return false;
  return true;
}

export function applyCatalogQuery(
  allItems: CatalogListItem[],
  query: CatalogQuery,
  options: ApplyCatalogOptions,
): { items: CatalogListItem[]; facets: { sizes: CatalogSize[]; colors: CatalogColor[] } } {
  let candidates = allItems;
  if (query.category === NEW_CATEGORY_SLUG) {
    const newest = [...allItems].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    candidates = options.newestLimit !== undefined ? newest.slice(0, options.newestLimit) : newest;
  } else if (query.category) {
    candidates = allItems.filter((item) => item.category?.slug === query.category);
  }

  // Facetas: solo talles/colores que existen en el conjunto de la categoría.
  const presentSizes = new Set(candidates.flatMap((item) => item.variants.map((v) => v.sizeId)));
  const presentColors = new Set(candidates.flatMap((item) => item.variants.map((v) => v.colorId)));
  const facets = {
    sizes: options.sizes.filter((size) => presentSizes.has(size.id)),
    colors: options.colors.filter((color) => presentColors.has(color.id)),
  };

  const colorNameById = new Map(options.colors.map((color) => [color.id, color.name]));
  const tokens = query.search ? normalizeText(query.search).split(/\s+/).filter(Boolean) : [];
  const usesVariantFilter = Boolean(query.sizeIds?.length || query.colorIds?.length || query.inStockOnly);

  const filtered = candidates.filter((item) => {
    if (tokens.length > 0) {
      // Nombre japonés + tipo + categoría + colores: los nombres japoneses
      // no perjudican la búsqueda (Bible §38.8).
      const haystack = normalizeText(
        [
          item.name,
          item.productType ?? "",
          item.description ?? "",
          item.category?.name ?? "",
          ...item.variants.map((v) => (v.colorId ? (colorNameById.get(v.colorId) ?? "") : "")),
        ].join(" "),
      );
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    if (usesVariantFilter && !item.variants.some((variant) => variantMatches(variant, query))) return false;
    if (query.minPrice !== undefined && item.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && item.price > query.maxPrice) return false;
    return true;
  });

  const sort = query.sort ?? "nuevo";
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "precio_asc") return a.price - b.price || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === "precio_desc") return b.price - a.price || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return { items: sorted, facets };
}

// ----------------------------------------------------------------------------
// URL <-> CatalogQuery (/catalogo?categoria=&q=&talle=&color=&min=&max=&stock=1&orden=)
// ----------------------------------------------------------------------------

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

function first(value: string | string[] | undefined): string | undefined {
  const [head] = list(value);
  return head;
}

function price(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseCatalogParams(params: SearchParamsRecord): CatalogQuery {
  const sort = first(params.orden);
  return {
    category: first(params.categoria),
    search: first(params.q),
    sizeIds: list(params.talle),
    colorIds: list(params.color),
    minPrice: price(params.min),
    maxPrice: price(params.max),
    inStockOnly: first(params.stock) === "1",
    sort: CATALOG_SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : undefined,
  };
}

export function catalogQueryToSearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.category) params.set("categoria", query.category);
  if (query.search) params.set("q", query.search);
  for (const id of query.sizeIds ?? []) params.append("talle", id);
  for (const id of query.colorIds ?? []) params.append("color", id);
  if (query.minPrice !== undefined) params.set("min", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("max", String(query.maxPrice));
  if (query.inStockOnly) params.set("stock", "1");
  if (query.sort && query.sort !== "nuevo") params.set("orden", query.sort);
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return Boolean(
    query.search ||
      query.sizeIds?.length ||
      query.colorIds?.length ||
      query.minPrice !== undefined ||
      query.maxPrice !== undefined ||
      query.inStockOnly,
  );
}
