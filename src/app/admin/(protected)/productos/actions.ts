"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createProduct,
  createVariant,
  deleteProductImage,
  PRODUCT_STATUSES,
  setPrimaryProductImage,
  updateProduct,
  updateVariant,
  uploadProductImage,
  type ProductInput,
  type ProductStatus,
  type VariantInput,
} from "@/services/admin";

// Todas las mutations de acá pasan por el cliente de SESIÓN del admin
// (createSupabaseServerClient) -- las policies admin_all_* de Supabase ya
// dan CRUD completo a un admin activo (ver services/admin/products.ts).
// Nada de esto necesita ni debe usar service-role.

export type ProductFormState = { error: string } | null;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas ya separadas por el NFD de arriba (acentos, ñ→n~)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parsea un campo opcional de datos físicos (peso/dimensiones): vacío -> null
 * (sin dato, no 0 -- ver migración add_product_shipping_dimensions), y valida
 * el mismo rango que el CHECK de la base (peso no negativo, dimensiones > 0),
 * para dar el mensaje de error acá en vez de dejar que lo rechace el CHECK.
 */
function parsePhysicalField(
  raw: string,
  label: string,
  options: { integer: boolean; allowZero: boolean },
): { value: number | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { error: `${label} debe ser un número.` };
  if (options.integer && !Number.isInteger(value)) return { error: `${label} debe ser un número entero.` };
  if (options.allowZero ? value < 0 : value <= 0) {
    return { error: options.allowZero ? `${label} no puede ser negativo.` : `${label} debe ser mayor a 0.` };
  }

  return { value };
}

function parseProductInput(formData: FormData): { input: ProductInput } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const isFeatured = formData.get("isFeatured") === "on";

  if (!name) return { error: "El nombre es obligatorio." };
  if (!categoryId) return { error: "Elegí una categoría." };
  if (!PRODUCT_STATUSES.includes(status as ProductStatus)) return { error: "Estado inválido." };

  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) return { error: "El precio debe ser un número mayor o igual a 0." };

  const slug = slugify(slugRaw || name);
  if (!slug) return { error: "No se pudo generar un slug válido a partir del nombre." };

  const weightGramsRaw = String(formData.get("weightGrams") ?? "");
  const lengthCmRaw = String(formData.get("lengthCm") ?? "");
  const widthCmRaw = String(formData.get("widthCm") ?? "");
  const heightCmRaw = String(formData.get("heightCm") ?? "");

  const weightGrams = parsePhysicalField(weightGramsRaw, "El peso", { integer: true, allowZero: true });
  if ("error" in weightGrams) return weightGrams;
  const lengthCm = parsePhysicalField(lengthCmRaw, "El largo", { integer: false, allowZero: false });
  if ("error" in lengthCm) return lengthCm;
  const widthCm = parsePhysicalField(widthCmRaw, "El ancho", { integer: false, allowZero: false });
  if ("error" in widthCm) return widthCm;
  const heightCm = parsePhysicalField(heightCmRaw, "El alto", { integer: false, allowZero: false });
  if ("error" in heightCm) return heightCm;

  return {
    input: {
      name,
      slug,
      description: description || null,
      price,
      categoryId,
      status: status as ProductStatus,
      isFeatured,
      weightGrams: weightGrams.value,
      lengthCm: lengthCm.value,
      widthCm: widthCm.value,
      heightCm: heightCm.value,
    },
  };
}

function friendlyProductError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("products_slug_key")) return "Ya existe un producto con ese slug.";
  return "No se pudo guardar el producto. Revisá los datos e intentá de nuevo.";
}

export async function createProductAction(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = parseProductInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createSupabaseServerClient();

  let productId: string;
  try {
    const result = await createProduct(supabase, parsed.input);
    productId = result.id;
  } catch (error) {
    return { error: friendlyProductError(error) };
  }

  redirect(`/admin/productos/${productId}`);
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createSupabaseServerClient();

  try {
    await updateProduct(supabase, productId, parsed.input);
  } catch (error) {
    return { error: friendlyProductError(error) };
  }

  redirect(`/admin/productos/${productId}?success=1`);
}

// ----------------------------------------------------------------------------
// Variantes -- forms simples sin JS, feedback vía ?error= en la misma URL.
// ----------------------------------------------------------------------------

function parseVariantInput(formData: FormData): { input: VariantInput } | { error: string } {
  const sizeId = String(formData.get("sizeId") ?? "").trim() || null;
  const colorId = String(formData.get("colorId") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const priceOverrideRaw = String(formData.get("priceOverride") ?? "").trim();
  const stockRaw = String(formData.get("stock") ?? "").trim();

  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "El stock debe ser un número entero mayor o igual a 0." };
  }

  let priceOverride: number | null = null;
  if (priceOverrideRaw) {
    priceOverride = Number(priceOverrideRaw);
    if (!Number.isFinite(priceOverride) || priceOverride < 0) {
      return { error: "El precio de la variante debe ser un número mayor o igual a 0." };
    }
  }

  return { input: { sizeId, colorId, sku, priceOverride, stock } };
}

function friendlyVariantError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("uq_variant_combo")) return "Ya existe una variante con esa combinación de talle/color.";
  if (message.includes("uq_variant_sku")) return "Ya existe una variante con ese SKU.";
  return "No se pudo guardar la variante.";
}

export async function createVariantAction(productId: string, formData: FormData): Promise<void> {
  const parsed = parseVariantInput(formData);
  if ("error" in parsed) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  try {
    await createVariant(supabase, productId, parsed.input);
  } catch (error) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent(friendlyVariantError(error))}`);
  }

  redirect(`/admin/productos/${productId}?success=1`);
}

export async function updateVariantAction(productId: string, variantId: string, formData: FormData): Promise<void> {
  const parsed = parseVariantInput(formData);
  const isActive = formData.get("isActive") === "on";

  if ("error" in parsed) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const supabase = await createSupabaseServerClient();
  try {
    await updateVariant(supabase, variantId, { ...parsed.input, isActive });
  } catch (error) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent(friendlyVariantError(error))}`);
  }

  redirect(`/admin/productos/${productId}?success=1`);
}

// ----------------------------------------------------------------------------
// Imágenes
// ----------------------------------------------------------------------------

export async function uploadImageAction(productId: string, formData: FormData): Promise<void> {
  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent("Elegí un archivo de imagen.")}`);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    redirect(
      `/admin/productos/${productId}?error=${encodeURIComponent("Formato de imagen no soportado (usá JPG, PNG, WEBP o GIF).")}`,
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent("La imagen supera el tamaño máximo permitido (5MB).")}`);
  }

  const supabase = await createSupabaseServerClient();
  try {
    await uploadProductImage(supabase, { productId, file, fileName: file.name, contentType: file.type, altText });
  } catch {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent("No se pudo subir la imagen.")}`);
  }

  redirect(`/admin/productos/${productId}?success=1`);
}

export async function setPrimaryImageAction(productId: string, imageId: string, formData: FormData): Promise<void> {
  void formData;
  const supabase = await createSupabaseServerClient();
  try {
    await setPrimaryProductImage(supabase, productId, imageId);
  } catch {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent("No se pudo marcar la imagen como principal.")}`);
  }
  redirect(`/admin/productos/${productId}?success=1`);
}

export async function deleteImageAction(productId: string, imageId: string, formData: FormData): Promise<void> {
  void formData;
  const supabase = await createSupabaseServerClient();
  try {
    await deleteProductImage(supabase, imageId);
  } catch {
    redirect(`/admin/productos/${productId}?error=${encodeURIComponent("No se pudo eliminar la imagen.")}`);
  }
  redirect(`/admin/productos/${productId}?success=1`);
}
