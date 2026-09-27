// Admin: inventario -- consulta y edición rápida de stock por variante.
// Convención de GXK Core: ver encabezado de src/services/admin/index.ts.
//
// Herramienta operativa, no un módulo de gestión de catálogo: reutiliza los
// tipos de talle/color/categoría e imagen de services/admin/products.ts, y
// el mismo cliente de SESIÓN del admin (las policies admin_all_* ya dan
// SELECT/UPDATE sobre product_variants a un admin activo -- no hace falta
// service-role acá tampoco). No duplica el CRUD de Productos: solo permite
// tocar `stock`, nunca talle/color/sku/precio/activo (eso sigue siendo
// exclusivo del editor de producto, ver services/admin/products.ts).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { buildImageUrl } from "@/services/catalog";
import type { AdminCategoryOption, AdminColorOption, AdminSizeOption, ProductStatus } from "./products";

// Umbral de stock bajo confirmado para GXK -- no inventar otro valor ni
// hacerlo configurable todavía. Vive acá (no en index.ts) para que
// index.ts pueda importarlo sin crear un ciclo de módulos; getDashboardSummary
// lo reutiliza desde acá (una sola fuente de verdad para la regla).
export const LOW_STOCK_THRESHOLD = 3;

export type StockStatus = "out_of_stock" | "low_stock" | "in_stock";

function computeStockStatus(stock: number): StockStatus {
  if (stock === 0) return "out_of_stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export type AdminInventoryItem = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  /** Estado de publicación del producto (draft/published/hidden/discontinued) -- ver services/admin/products.ProductStatus. */
  productStatus: string;
  primaryImageUrl: string | null;
  category: AdminCategoryOption | null;
  size: AdminSizeOption | null;
  color: AdminColorOption | null;
  sku: string | null;
  stock: number;
  stockStatus: StockStatus;
  /** product_variants.is_active -- de solo lectura acá, se edita desde Productos. */
  isActive: boolean;
};

export type InventoryFilters = {
  /** Nombre del producto o SKU (case-insensitive, substring). */
  search?: string;
  stockStatus?: StockStatus | "all";
  categoryId?: string;
  productStatus?: ProductStatus;
  sort?: "product_asc" | "stock_asc" | "stock_desc";
};

type InventoryQueryRow = Pick<
  Tables<"product_variants">,
  "id" | "sku" | "stock" | "is_active" | "size_id" | "color_id" | "product_id"
> & {
  products: Pick<Tables<"products">, "id" | "slug" | "name" | "status"> & {
    categories: Pick<Tables<"categories">, "id" | "name"> | null;
    product_images: Pick<Tables<"product_images">, "storage_path" | "is_primary" | "sort_order">[];
  };
};

/**
 * Todas las variantes (activas e inactivas, de cualquier producto sin
 * importar su estado de publicación -- mismo criterio que
 * services/admin.getStockAlerts: un producto en draft/hidden con poco stock
 * sigue siendo información accionable). `search`, `stockStatus` dependen de
 * datos calculados/cruzados que PostgREST no puede filtrar en un solo
 * select, así que se resuelven acá en JS después de traer el resto ya
 * filtrado/ordenado.
 */
export async function getInventoryItems(
  supabase: GxkSupabaseClient,
  filters: InventoryFilters = {},
): Promise<AdminInventoryItem[]> {
  let query = supabase
    .from("product_variants")
    .select(
      "id, sku, stock, is_active, size_id, color_id, product_id, products!inner ( id, slug, name, status, category_id, categories ( id, name ), product_images ( storage_path, is_primary, sort_order ) )",
    );

  if (filters.categoryId) {
    query = query.eq("products.category_id", filters.categoryId);
  }
  if (filters.productStatus) {
    query = query.eq("products.status", filters.productStatus);
  }

  // "product_asc" NO se puede pedirle a PostgREST acá: `order` con
  // referencedTable solo reordena un array anidado (uno-a-muchos, ej.
  // product_images dentro de cada producto), no las filas externas por una
  // columna de la relación muchos-a-uno hacia products -- se ordena en JS
  // después de traer los datos (mismo criterio que ya usa outOfStock más
  // abajo para lo que PostgREST no puede filtrar/ordenar en un solo select).
  if (filters.sort === "stock_asc") {
    query = query.order("stock", { ascending: true });
  } else if (filters.sort === "stock_desc") {
    query = query.order("stock", { ascending: false });
  }

  const { data, error } = await query.returns<InventoryQueryRow[]>();
  if (error) throw error;

  const rows = data ?? [];
  const sizeIds = [...new Set(rows.map((row) => row.size_id).filter((v): v is string => v !== null))];
  const colorIds = [...new Set(rows.map((row) => row.color_id).filter((v): v is string => v !== null))];

  const [sizesRes, colorsRes] = await Promise.all([
    sizeIds.length > 0
      ? supabase.from("sizes").select("id, name").in("id", sizeIds)
      : Promise.resolve<{ data: Pick<Tables<"sizes">, "id" | "name">[]; error: null }>({ data: [], error: null }),
    colorIds.length > 0
      ? supabase.from("colors").select("id, name, hex_code").in("id", colorIds)
      : Promise.resolve<{ data: Pick<Tables<"colors">, "id" | "name" | "hex_code">[]; error: null }>({
          data: [],
          error: null,
        }),
  ]);

  if (sizesRes.error) throw sizesRes.error;
  if (colorsRes.error) throw colorsRes.error;

  const sizesById = new Map((sizesRes.data ?? []).map((row) => [row.id, row]));
  const colorsById = new Map((colorsRes.data ?? []).map((row) => [row.id, row]));

  let items: AdminInventoryItem[] = rows.map((row) => {
    const images = row.products.product_images ?? [];
    const primary = images.find((img) => img.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0];

    return {
      variantId: row.id,
      productId: row.products.id,
      productSlug: row.products.slug,
      productName: row.products.name,
      productStatus: row.products.status,
      primaryImageUrl: primary ? buildImageUrl(supabase, primary.storage_path) : null,
      category: row.products.categories ? { id: row.products.categories.id, name: row.products.categories.name } : null,
      size: row.size_id && sizesById.has(row.size_id) ? { id: row.size_id, name: sizesById.get(row.size_id)!.name } : null,
      color:
        row.color_id && colorsById.has(row.color_id)
          ? {
              id: row.color_id,
              name: colorsById.get(row.color_id)!.name,
              hexCode: colorsById.get(row.color_id)!.hex_code,
            }
          : null,
      sku: row.sku,
      stock: row.stock,
      stockStatus: computeStockStatus(row.stock),
      isActive: row.is_active,
    };
  });

  if (filters.search) {
    const term = filters.search.toLowerCase();
    items = items.filter(
      (item) => item.productName.toLowerCase().includes(term) || (item.sku ?? "").toLowerCase().includes(term),
    );
  }

  if (filters.stockStatus && filters.stockStatus !== "all") {
    items = items.filter((item) => item.stockStatus === filters.stockStatus);
  }

  if (filters.sort !== "stock_asc" && filters.sort !== "stock_desc") {
    items = [...items].sort((a, b) => a.productName.localeCompare(b.productName));
  }

  return items;
}

/**
 * Actualiza ÚNICAMENTE el stock de una variante -- ni size/color/sku/precio
 * ni is_active se tocan, a diferencia de products.updateVariant (el editor
 * completo de Productos). Es el mismo campo `product_variants.stock` que
 * usa create_order_with_reservation/el carrito/el checkout: no se
 * introduce ninguna columna ni tabla paralela.
 */
export async function updateVariantStock(supabase: GxkSupabaseClient, variantId: string, stock: number): Promise<void> {
  const { error } = await supabase.from("product_variants").update({ stock }).eq("id", variantId);
  if (error) throw error;
}
