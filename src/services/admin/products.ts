// Admin: gestión de catálogo (productos, variantes, imágenes) para Admin Web.
// Convención de GXK Core: ver encabezado de src/services/admin/index.ts.
//
// Todo acá corre con el cliente de SESIÓN del admin (nunca service-role):
// las policies admin_all_* de categories/products/product_images/sizes/
// colors/product_variants ya dan CRUD completo a "authenticated + fila
// activa en admins" (ver migración inicial), y las policies de
// storage.objects hacen lo mismo para el bucket product-images (ver
// migración storage_product_images). No hace falta -- ni corresponde --
// usar createSupabaseAdminClient para nada de este módulo.

import { randomUUID } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { buildImageUrl, PRODUCT_IMAGES_BUCKET } from "@/services/catalog";

// Debe coincidir exactamente con el CHECK de products.status (ver migración
// inicial) -- no inventar estados nuevos.
export const PRODUCT_STATUSES = ["draft", "published", "hidden", "discontinued"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// ----------------------------------------------------------------------------
// Opciones para selects de categoría/talle/color. A diferencia de
// services/catalog (que solo expone lo público/activo), acá se listan TODAS
// las filas: el admin necesita poder asignar/filtrar por cualquier
// categoría/talle/color, esté o no activo actualmente.
// ----------------------------------------------------------------------------

export type AdminCategoryOption = { id: string; name: string };
export type AdminSizeOption = { id: string; name: string };
export type AdminColorOption = { id: string; name: string; hexCode: string | null };

export async function getCategoryOptions(supabase: GxkSupabaseClient): Promise<AdminCategoryOption[]> {
  const { data, error } = await supabase.from("categories").select("id, name").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getSizeOptions(supabase: GxkSupabaseClient): Promise<AdminSizeOption[]> {
  const { data, error } = await supabase.from("sizes").select("id, name").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getColorOptions(supabase: GxkSupabaseClient): Promise<AdminColorOption[]> {
  const { data, error } = await supabase.from("colors").select("id, name, hex_code").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, hexCode: row.hex_code }));
}

// ----------------------------------------------------------------------------
// Listado
// ----------------------------------------------------------------------------

export type AdminProductListItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  status: string;
  isFeatured: boolean;
  updatedAt: string;
  category: AdminCategoryOption | null;
  primaryImageUrl: string | null;
  variantCount: number;
  /** Suma de stock de variantes activas -- 0 significa agotado. */
  totalStock: number;
};

export type AdminProductFilters = {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  /** true = solo productos con stock total (variantes activas) en 0. */
  outOfStock?: boolean;
  sort?: "updated_desc" | "name_asc" | "price_asc" | "price_desc";
};

type AdminProductListQueryRow = Pick<
  Tables<"products">,
  "id" | "slug" | "name" | "price" | "status" | "is_featured" | "updated_at"
> & {
  categories: Pick<Tables<"categories">, "id" | "name"> | null;
  product_images: Pick<Tables<"product_images">, "id" | "storage_path" | "is_primary" | "sort_order">[];
  product_variants: Pick<Tables<"product_variants">, "id" | "stock" | "is_active">[];
};

/**
 * Listado de productos para /admin/productos, con imagen principal,
 * categoría, cantidad de variantes y stock total ya resueltos -- para que
 * la página no tenga que hacer joins/cálculos propios.
 */
export async function getAdminProducts(
  supabase: GxkSupabaseClient,
  filters: AdminProductFilters = {},
): Promise<AdminProductListItem[]> {
  let query = supabase
    .from("products")
    .select(
      "id, slug, name, price, status, is_featured, updated_at, categories ( id, name ), product_images ( id, storage_path, is_primary, sort_order ), product_variants ( id, stock, is_active )",
    );

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  switch (filters.sort) {
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query.returns<AdminProductListQueryRow[]>();
  if (error) throw error;

  const items: AdminProductListItem[] = (data ?? []).map((row) => {
    const images = row.product_images ?? [];
    const primary = images.find((img) => img.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
    const activeVariants = (row.product_variants ?? []).filter((variant) => variant.is_active);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      price: row.price,
      status: row.status,
      isFeatured: row.is_featured,
      updatedAt: row.updated_at,
      category: row.categories ? { id: row.categories.id, name: row.categories.name } : null,
      primaryImageUrl: primary ? buildImageUrl(supabase, primary.storage_path) : null,
      variantCount: row.product_variants?.length ?? 0,
      totalStock: activeVariants.reduce((sum, variant) => sum + variant.stock, 0),
    };
  });

  // outOfStock depende de un cálculo agregado (suma de stock entre
  // variantes) que no se puede expresar como filtro de PostgREST sin una
  // vista/función nueva -- se filtra acá, después de resolverlo en JS.
  return filters.outOfStock ? items.filter((item) => item.totalStock === 0) : items;
}

// ----------------------------------------------------------------------------
// Detalle (editor de producto)
// ----------------------------------------------------------------------------

export type AdminProductVariant = {
  id: string;
  sku: string | null;
  priceOverride: number | null;
  stock: number;
  isActive: boolean;
  size: AdminSizeOption | null;
  color: AdminColorOption | null;
};

export type AdminProductImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type AdminProductDetail = {
  id: string;
  slug: string;
  name: string;
  productType: string | null;
  description: string | null;
  composition: string | null;
  /** Members Only — 24H Early Access (Bible §24). */
  membersOnlyUntil: string | null;
  price: number;
  status: string;
  isFeatured: boolean;
  categoryId: string;
  updatedAt: string;
  /** Datos físicos para Shipping (PRO-127) -- ver migración add_product_shipping_dimensions. NULL = sin cargar todavía. */
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
};

type AdminProductDetailQueryRow = Pick<
  Tables<"products">,
  | "id"
  | "slug"
  | "name"
  | "product_type"
  | "description"
  | "composition"
  | "members_only_until"
  | "price"
  | "status"
  | "is_featured"
  | "category_id"
  | "updated_at"
  | "weight_grams"
  | "length_cm"
  | "width_cm"
  | "height_cm"
> & {
  product_images: Pick<Tables<"product_images">, "id" | "storage_path" | "alt_text" | "is_primary" | "sort_order">[];
  product_variants: Pick<
    Tables<"product_variants">,
    "id" | "sku" | "price_override" | "stock" | "is_active" | "size_id" | "color_id"
  >[];
};

/**
 * Producto completo para el editor: incluye TODAS las variantes (activas e
 * inactivas) e imágenes -- a diferencia de services/catalog, que solo
 * expone lo público. Devuelve `null` si no existe.
 */
export async function getAdminProductById(supabase: GxkSupabaseClient, id: string): Promise<AdminProductDetail | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, product_type, description, composition, members_only_until, price, status, is_featured, category_id, updated_at, weight_grams, length_cm, width_cm, height_cm, product_images ( id, storage_path, alt_text, is_primary, sort_order ), product_variants ( id, sku, price_override, stock, is_active, size_id, color_id )",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<AdminProductDetailQueryRow>();

  if (error) throw error;
  if (!product) return null;

  const sizeIds = [...new Set(product.product_variants.map((v) => v.size_id).filter((v): v is string => v !== null))];
  const colorIds = [...new Set(product.product_variants.map((v) => v.color_id).filter((v): v is string => v !== null))];

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

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productType: product.product_type,
    description: product.description,
    composition: product.composition,
    membersOnlyUntil: product.members_only_until,
    price: product.price,
    status: product.status,
    isFeatured: product.is_featured,
    categoryId: product.category_id,
    updatedAt: product.updated_at,
    weightGrams: product.weight_grams,
    lengthCm: product.length_cm,
    widthCm: product.width_cm,
    heightCm: product.height_cm,
    images: [...product.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        id: img.id,
        url: buildImageUrl(supabase, img.storage_path),
        altText: img.alt_text,
        isPrimary: img.is_primary,
        sortOrder: img.sort_order,
      })),
    variants: product.product_variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      priceOverride: variant.price_override,
      stock: variant.stock,
      isActive: variant.is_active,
      size: variant.size_id && sizesById.has(variant.size_id) ? { id: variant.size_id, name: sizesById.get(variant.size_id)!.name } : null,
      color:
        variant.color_id && colorsById.has(variant.color_id)
          ? {
              id: variant.color_id,
              name: colorsById.get(variant.color_id)!.name,
              hexCode: colorsById.get(variant.color_id)!.hex_code,
            }
          : null,
    })),
  };
}

// ----------------------------------------------------------------------------
// Mutaciones: producto
// ----------------------------------------------------------------------------

export type ProductInput = {
  name: string;
  slug: string;
  /** Tipo de prenda (Bible §16). */
  productType: string | null;
  description: string | null;
  /** Composición (Bible §16). */
  composition: string | null;
  /** Members Only — 24H Early Access hasta (Bible §24); null = público al publicarse. */
  membersOnlyUntil: string | null;
  price: number;
  categoryId: string;
  status: ProductStatus;
  isFeatured: boolean;
  /** Datos físicos para Shipping (PRO-127) -- gramos/centímetros, NULL = sin cargar todavía. */
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

export async function createProduct(supabase: GxkSupabaseClient, input: ProductInput): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug,
      product_type: input.productType,
      description: input.description,
      composition: input.composition,
      members_only_until: input.membersOnlyUntil,
      price: input.price,
      category_id: input.categoryId,
      status: input.status,
      is_featured: input.isFeatured,
      weight_grams: input.weightGrams,
      length_cm: input.lengthCm,
      width_cm: input.widthCm,
      height_cm: input.heightCm,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

/**
 * Actualiza los campos "core" del producto (todo lo que no sea variantes o
 * imágenes, que se manejan con sus propias funciones). El form del editor
 * siempre manda el conjunto completo de estos campos, así que no hace
 * falta un update parcial -- lo que no cambió llega con el mismo valor que
 * ya tenía.
 */
export async function updateProduct(supabase: GxkSupabaseClient, id: string, input: ProductInput): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug: input.slug,
      product_type: input.productType,
      description: input.description,
      composition: input.composition,
      members_only_until: input.membersOnlyUntil,
      price: input.price,
      category_id: input.categoryId,
      status: input.status,
      is_featured: input.isFeatured,
      weight_grams: input.weightGrams,
      length_cm: input.lengthCm,
      width_cm: input.widthCm,
      height_cm: input.heightCm,
    })
    .eq("id", id);

  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Mutaciones: variantes
// ----------------------------------------------------------------------------

export type VariantInput = {
  sizeId: string | null;
  colorId: string | null;
  sku: string | null;
  priceOverride: number | null;
  stock: number;
};

export async function createVariant(
  supabase: GxkSupabaseClient,
  productId: string,
  input: VariantInput,
): Promise<void> {
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    size_id: input.sizeId,
    color_id: input.colorId,
    sku: input.sku,
    price_override: input.priceOverride,
    stock: input.stock,
  });

  if (error) throw error;
}

/**
 * Actualiza una variante existente, incluyendo is_active -- no hay una
 * acción de "activar/desactivar" separada, es un campo más del mismo form
 * por fila (ver ProductVariantsManager).
 */
export async function updateVariant(
  supabase: GxkSupabaseClient,
  variantId: string,
  input: VariantInput & { isActive: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("product_variants")
    .update({
      size_id: input.sizeId,
      color_id: input.colorId,
      sku: input.sku,
      price_override: input.priceOverride,
      stock: input.stock,
      is_active: input.isActive,
    })
    .eq("id", variantId);

  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Mutaciones: imágenes
// ----------------------------------------------------------------------------

async function clearPrimaryImage(supabase: GxkSupabaseClient, productId: string): Promise<void> {
  const { error } = await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  if (error) throw error;
}

/**
 * Sube un archivo al bucket product-images y crea su fila en
 * product_images. Si es la primera imagen del producto, queda como
 * principal automáticamente (si no, el admin la marca a mano después).
 */
export async function uploadProductImage(
  supabase: GxkSupabaseClient,
  input: { productId: string; file: Blob; fileName: string; contentType: string; altText: string | null },
): Promise<void> {
  const { data: existingImages, error: countError } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", input.productId);

  if (countError) throw countError;

  const isFirstImage = (existingImages?.length ?? 0) === 0;
  const nextSortOrder = (existingImages ?? []).reduce((max, img) => Math.max(max, img.sort_order), -1) + 1;

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${input.productId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, input.file, { contentType: input.contentType, upsert: false });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: input.productId,
    storage_path: storagePath,
    alt_text: input.altText,
    is_primary: isFirstImage,
    sort_order: nextSortOrder,
  });

  if (insertError) throw insertError;
}

export async function setPrimaryProductImage(
  supabase: GxkSupabaseClient,
  productId: string,
  imageId: string,
): Promise<void> {
  await clearPrimaryImage(supabase, productId);

  const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (error) throw error;
}

/**
 * Borra la fila de product_images y, en la medida de lo posible, el objeto
 * de Storage. Si el borrado del objeto falla, no se revierte el borrado de
 * la fila: un archivo huérfano en Storage es mucho menos grave que una fila
 * apuntando a algo que ya decidimos borrar, y se puede limpiar después.
 */
export async function deleteProductImage(supabase: GxkSupabaseClient, imageId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (fetchError) throw fetchError;

  const { error: deleteError } = await supabase.from("product_images").delete().eq("id", imageId);
  if (deleteError) throw deleteError;

  const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([data.storage_path]);
  if (storageError) {
    console.error(`No se pudo borrar el objeto de Storage ${data.storage_path}:`, storageError);
  }
}

// ----------------------------------------------------------------------------
// Medidas reales por talle (Bible §20)
// ----------------------------------------------------------------------------

export type AdminMeasurementRow = { sizeId: string | null; label: string; valueCm: number };

export async function getProductMeasurementRows(supabase: GxkSupabaseClient, productId: string): Promise<AdminMeasurementRow[]> {
  const { data, error } = await supabase
    .from("product_measurements")
    .select("size_id, label, value_cm, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ sizeId: row.size_id, label: row.label, valueCm: Number(row.value_cm) }));
}

/**
 * Reemplaza la tabla de medidas del producto por la recibida (ya validada).
 * El orden de las etiquetas define sort_order.
 */
export async function replaceProductMeasurements(
  supabase: GxkSupabaseClient,
  productId: string,
  labels: string[],
  rows: AdminMeasurementRow[],
): Promise<void> {
  const { error: deleteError } = await supabase.from("product_measurements").delete().eq("product_id", productId);
  if (deleteError) throw deleteError;
  if (rows.length === 0) return;
  const { error } = await supabase.from("product_measurements").insert(
    rows.map((row) => ({
      product_id: productId,
      size_id: row.sizeId,
      label: row.label,
      value_cm: row.valueCm,
      sort_order: Math.max(0, labels.indexOf(row.label)),
    })),
  );
  if (error) throw error;
}
