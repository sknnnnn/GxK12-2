// Catalog: consultas server-side de categorías, productos, imágenes y variantes.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// Todo lo de acá usa exclusivamente RLS pública (categorías activas,
// productos publicados, imágenes de productos publicados) y la vista
// storefront_product_variants. Nunca se consulta product_variants
// directamente ni se expone el conteo real de stock — solo el booleano
// in_stock que ya expone la vista pública.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";

// Nombre del bucket de Supabase Storage donde viven las imágenes de
// producto. DECISIÓN PENDIENTE DE CONFIRMAR: no existe ningún bucket creado
// todavía en el proyecto Supabase (storage.buckets está vacío) y el nombre
// no está documentado en la Arquitectura técnica — solo dice que las
// imágenes "se almacenan en Supabase Storage". Se deja esta constante como
// placeholder explícito; ajustar cuando se cree/confirme el bucket real.
export const PRODUCT_IMAGES_BUCKET = "product-images";

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
};

export type CatalogSize = {
  id: string;
  name: string;
};

export type CatalogColor = {
  id: string;
  name: string;
  hexCode: string | null;
};

export type CatalogProductImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type CatalogProductSummary = {
  id: string;
  slug: string;
  name: string;
  price: number;
  isFeatured: boolean;
  category: CatalogCategory | null;
  primaryImage: CatalogProductImage | null;
  inStock: boolean;
};

export type CatalogVariant = {
  id: string;
  sku: string | null;
  priceOverride: number | null;
  inStock: boolean;
  size: CatalogSize | null;
  color: CatalogColor | null;
};

export type CatalogProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  category: CatalogCategory | null;
  images: CatalogProductImage[];
  variants: CatalogVariant[];
  sizes: CatalogSize[];
  colors: CatalogColor[];
  inStock: boolean;
};

// ----------------------------------------------------------------------------
// Shapes crudas de fila usadas para tipar explícitamente las respuestas de
// Supabase (.returns<T>()) en vez de depender de la inferencia automática
// de selects con relaciones embebidas, que es frágil para este caso de uso.
// ----------------------------------------------------------------------------

type CategoryRow = Pick<Tables<"categories">, "id" | "slug" | "name">;
type SizeRow = Pick<Tables<"sizes">, "id" | "name">;
type ColorRow = Pick<Tables<"colors">, "id" | "name" | "hex_code">;

type ProductImageRow = Pick<
  Tables<"product_images">,
  "id" | "storage_path" | "alt_text" | "is_primary" | "sort_order"
>;

type ProductListRow = Pick<Tables<"products">, "id" | "slug" | "name" | "price" | "is_featured"> & {
  categories: CategoryRow | null;
  product_images: ProductImageRow[];
};

type ProductDetailRow = Pick<Tables<"products">, "id" | "slug" | "name" | "description" | "price"> & {
  categories: CategoryRow | null;
  product_images: ProductImageRow[];
};

// La vista pública storefront_product_variants declara todas sus columnas
// nullable en los tipos generados (limitación del generador de Supabase
// sobre vistas, no refleja la realidad de los datos). Se ajusta acá,
// localizadamente, filtrando filas sin id/in_stock antes de usarlas.
type VariantRow = Pick<
  Tables<"storefront_product_variants">,
  "id" | "product_id" | "size_id" | "color_id" | "sku" | "price_override" | "in_stock"
>;

export function buildImageUrl(supabase: GxkSupabaseClient, storagePath: string): string {
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function toCategory(row: CategoryRow | null): CatalogCategory | null {
  return row ? { id: row.id, slug: row.slug, name: row.name } : null;
}

function toImages(supabase: GxkSupabaseClient, rows: ProductImageRow[]): CatalogProductImage[] {
  return rows.map((row) => ({
    id: row.id,
    url: buildImageUrl(supabase, row.storage_path),
    altText: row.alt_text,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
  }));
}

function pickPrimaryImage(images: CatalogProductImage[]): CatalogProductImage | null {
  if (images.length === 0) return null;
  return images.find((img) => img.isPrimary) ?? images[0];
}

/**
 * Categorías activas, ordenadas para navegación/filtros del storefront.
 */
export async function getPublishedCategories(supabase: GxkSupabaseClient): Promise<CatalogCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<CategoryRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, slug: row.slug, name: row.name }));
}

async function queryPublishedProducts(
  supabase: GxkSupabaseClient,
  options: { categorySlug?: string; featuredOnly?: boolean; limit?: number },
): Promise<CatalogProductSummary[]> {
  const categoryEmbed = options.categorySlug
    ? "categories!inner ( id, slug, name )"
    : "categories ( id, slug, name )";

  let query = supabase
    .from("products")
    .select(
      `id, slug, name, price, is_featured, ${categoryEmbed}, product_images ( id, storage_path, alt_text, is_primary, sort_order )`,
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true });

  if (options.categorySlug) {
    query = query.eq("categories.slug", options.categorySlug);
  }
  if (options.featuredOnly) {
    query = query.eq("is_featured", true);
  }
  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<ProductListRow[]>();
  if (error) throw error;

  const products = data ?? [];
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const { data: variantRows, error: variantsError } = await supabase
    .from("storefront_product_variants")
    .select("product_id, in_stock")
    .in("product_id", productIds)
    .returns<Pick<VariantRow, "product_id" | "in_stock">[]>();

  if (variantsError) throw variantsError;

  const inStockByProduct = new Map<string, boolean>();
  for (const row of variantRows ?? []) {
    if (!row.product_id) continue;
    if (row.in_stock) {
      inStockByProduct.set(row.product_id, true);
    } else if (!inStockByProduct.has(row.product_id)) {
      inStockByProduct.set(row.product_id, false);
    }
  }

  return products.map((row) => {
    const images = toImages(supabase, row.product_images ?? []);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      price: row.price,
      isFeatured: row.is_featured,
      category: toCategory(row.categories),
      primaryImage: pickPrimaryImage(images),
      inStock: inStockByProduct.get(row.id) ?? false,
    };
  });
}

/**
 * Productos publicados para el catálogo público. `categorySlug` filtra por
 * una categoría activa específica; sin él, devuelve todos los publicados.
 */
export async function getPublishedProducts(
  supabase: GxkSupabaseClient,
  options?: { categorySlug?: string },
): Promise<CatalogProductSummary[]> {
  return queryPublishedProducts(supabase, { categorySlug: options?.categorySlug });
}

/**
 * Productos publicados y marcados como destacados (is_featured).
 */
export async function getFeaturedProducts(supabase: GxkSupabaseClient): Promise<CatalogProductSummary[]> {
  return queryPublishedProducts(supabase, { featuredOnly: true });
}

/**
 * Últimos productos publicados, del más reciente al más antiguo según
 * `products.created_at`. `limit` es obligatorio y se normaliza a entero
 * positivo: con 0, negativo o NaN devuelve `[]` (estado vacío) sin consultar.
 */
export async function getNewArrivals(
  supabase: GxkSupabaseClient,
  options: { limit: number },
): Promise<CatalogProductSummary[]> {
  const limit = Math.floor(options.limit);
  if (!Number.isFinite(limit) || limit < 1) return [];
  return queryPublishedProducts(supabase, { limit });
}

const PRODUCT_DETAIL_SELECT =
  "id, slug, name, description, price, categories ( id, slug, name ), product_images ( id, storage_path, alt_text, is_primary, sort_order )";

/**
 * Arma el detalle (imágenes, variantes, talles y colores derivados de sus
 * variantes) de una o más filas de producto ya leídas, con un único
 * conjunto de consultas de variantes/talles/colores para todas (sin N+1).
 * Lo comparten getProductBySlug y getProductDetailsByIds.
 */
async function buildProductDetails(
  supabase: GxkSupabaseClient,
  products: ProductDetailRow[],
): Promise<CatalogProductDetail[]> {
  if (products.length === 0) return [];

  const { data: variantRows, error: variantsError } = await supabase
    .from("storefront_product_variants")
    .select("id, product_id, size_id, color_id, sku, price_override, in_stock")
    .in(
      "product_id",
      products.map((p) => p.id),
    )
    .returns<VariantRow[]>();

  if (variantsError) throw variantsError;

  const validVariants = (variantRows ?? []).filter(
    (row): row is VariantRow & { id: string; in_stock: boolean } => row.id !== null && row.in_stock !== null,
  );

  const sizeIds = [...new Set(validVariants.map((v) => v.size_id).filter((id): id is string => id !== null))];
  const colorIds = [...new Set(validVariants.map((v) => v.color_id).filter((id): id is string => id !== null))];

  const [sizesRes, colorsRes] = await Promise.all([
    sizeIds.length > 0
      ? supabase.from("sizes").select("id, name").in("id", sizeIds).order("name", { ascending: true }).returns<SizeRow[]>()
      : Promise.resolve<{ data: SizeRow[]; error: null }>({ data: [], error: null }),
    colorIds.length > 0
      ? supabase
          .from("colors")
          .select("id, name, hex_code")
          .in("id", colorIds)
          .order("name", { ascending: true })
          .returns<ColorRow[]>()
      : Promise.resolve<{ data: ColorRow[]; error: null }>({ data: [], error: null }),
  ]);

  if (sizesRes.error) throw sizesRes.error;
  if (colorsRes.error) throw colorsRes.error;

  // Se conserva el orden de la consulta (por nombre) al filtrar por producto.
  const allSizes = sizesRes.data ?? [];
  const allColors = colorsRes.data ?? [];
  const sizesById = new Map(allSizes.map((row) => [row.id, row]));
  const colorsById = new Map(allColors.map((row) => [row.id, row]));

  return products.map((product) => {
    const productVariants = validVariants.filter((v) => v.product_id === product.id);

    const variants: CatalogVariant[] = productVariants.map((row) => ({
      id: row.id,
      sku: row.sku,
      priceOverride: row.price_override,
      inStock: row.in_stock,
      size: row.size_id && sizesById.has(row.size_id) ? { id: row.size_id, name: sizesById.get(row.size_id)!.name } : null,
      color:
        row.color_id && colorsById.has(row.color_id)
          ? {
              id: row.color_id,
              name: colorsById.get(row.color_id)!.name,
              hexCode: colorsById.get(row.color_id)!.hex_code,
            }
          : null,
    }));

    const productSizeIds = new Set(productVariants.map((v) => v.size_id));
    const productColorIds = new Set(productVariants.map((v) => v.color_id));

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      category: toCategory(product.categories),
      images: toImages(supabase, product.product_images ?? []),
      variants,
      sizes: allSizes.filter((row) => productSizeIds.has(row.id)).map((row) => ({ id: row.id, name: row.name })),
      colors: allColors
        .filter((row) => productColorIds.has(row.id))
        .map((row) => ({ id: row.id, name: row.name, hexCode: row.hex_code })),
      inStock: variants.some((v) => v.inStock),
    };
  });
}

/**
 * Producto individual publicado, con imágenes, variantes activas y los
 * talles/colores derivados de esas variantes.
 *
 * Devuelve `null` tanto si el producto no existe como si existe pero no
 * está publicado (draft/hidden/discontinued): la policy RLS pública sobre
 * `products` ya filtra por status = 'published', así que desde el storefront
 * público ambos casos son indistinguibles por diseño — no se debe revelar
 * si un producto oculto existe. El caller trata `null` como "no encontrado".
 */
export async function getProductBySlug(
  supabase: GxkSupabaseClient,
  slug: string,
): Promise<CatalogProductDetail | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .maybeSingle()
    .returns<ProductDetailRow>();

  if (error) throw error;
  if (!product) return null;

  return (await buildProductDetails(supabase, [product]))[0];
}

/**
 * Detalle (con variantes) de varios productos publicados por id, en un
 * único conjunto de consultas. Los ids no publicados no aparecen (RLS). No
 * garantiza el orden de `ids`.
 */
export async function getProductDetailsByIds(
  supabase: GxkSupabaseClient,
  ids: string[],
): Promise<CatalogProductDetail[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .in("id", ids)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .returns<ProductDetailRow[]>();

  if (error) throw error;
  return buildProductDetails(supabase, data ?? []);
}
