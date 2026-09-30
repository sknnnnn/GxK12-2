"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addOutfitProduct,
  checkImageUpload,
  createOutfit,
  deleteOutfit,
  OUTFIT_STATUSES,
  OUTFIT_STYLES,
  removeContentImage,
  removeOutfitProduct,
  setOutfitCover,
  updateOutfit,
  updateOutfitProductOrder,
  uploadContentImage,
  type OutfitInput,
  type OutfitStatus,
  type OutfitStyle,
} from "@/services/admin";
import { slugify } from "@/lib/slug";
import { localInputToIso } from "@/lib/datetime";

function detail(id: string, query: string): never {
  redirect(`/admin/outfits/${id}?${query}`);
}

function errorOf(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  if (message.includes("duplicate key") && message.includes("slug")) return "Ya existe un outfit con ese slug.";
  if (message.includes("uq_outfit_products_combo")) return "Ese producto/variante ya está en el outfit.";
  if (message.includes("chk_outfit_dates")) return "La fecha de fin debe ser posterior a la de inicio.";
  return "No se pudo guardar. Revisá los datos.";
}

function parseOutfit(formData: FormData): { ok: true; input: OutfitInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
  const status = String(formData.get("status") ?? "draft");
  const style = String(formData.get("style") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!name || !slug) return { ok: false, error: "El outfit necesita un nombre." };
  if (!(OUTFIT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Estado inválido." };
  if (style && !(OUTFIT_STYLES as readonly string[]).includes(style)) return { ok: false, error: "Estilo inválido." };
  if (!Number.isInteger(sortOrder)) return { ok: false, error: "El orden debe ser un número entero." };
  return {
    ok: true,
    input: {
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      style: (style || null) as OutfitStyle | null,
      status: status as OutfitStatus,
      startsAt: localInputToIso(String(formData.get("startsAt") ?? "")),
      endsAt: localInputToIso(String(formData.get("endsAt") ?? "")),
      sortOrder,
    },
  };
}

export async function createOutfitAction(formData: FormData): Promise<void> {
  const parsed = parseOutfit(formData);
  if (!parsed.ok) redirect(`/admin/outfits?error=${encodeURIComponent(parsed.error)}`);
  let id: string;
  try {
    id = await createOutfit(await createSupabaseServerClient(), parsed.input);
  } catch (error) {
    redirect(`/admin/outfits?error=${encodeURIComponent(errorOf(error))}`);
  }
  detail(id, "success=1");
}

export async function updateOutfitAction(id: string, formData: FormData): Promise<void> {
  const parsed = parseOutfit(formData);
  if (!parsed.ok) detail(id, `error=${encodeURIComponent(parsed.error)}`);
  try {
    await updateOutfit(await createSupabaseServerClient(), id, parsed.input);
  } catch (error) {
    detail(id, `error=${encodeURIComponent(errorOf(error))}`);
  }
  detail(id, "success=1");
}

export async function uploadOutfitCoverAction(id: string, previousPath: string | null, formData: FormData): Promise<void> {
  const check = checkImageUpload(formData.get("file"));
  if (!check) detail(id, `error=${encodeURIComponent("Elegí una imagen.")}`);
  if (!check.ok) detail(id, `error=${encodeURIComponent(check.error)}`);
  const supabase = await createSupabaseServerClient();
  try {
    const path = await uploadContentImage(supabase, `outfits/${id}`, check.file);
    await setOutfitCover(supabase, id, path);
    await removeContentImage(supabase, previousPath);
  } catch {
    detail(id, `error=${encodeURIComponent("No se pudo subir la portada.")}`);
  }
  detail(id, "success=1");
}

export async function removeOutfitCoverAction(id: string, previousPath: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await setOutfitCover(supabase, id, null);
  await removeContentImage(supabase, previousPath);
  detail(id, "success=1");
}

export async function addOutfitProductAction(id: string, formData: FormData): Promise<void> {
  const selection = String(formData.get("selection") ?? "");
  const [productId, variantId] = selection.split(":");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!productId) detail(id, `error=${encodeURIComponent("Elegí un producto.")}`);
  try {
    await addOutfitProduct(await createSupabaseServerClient(), id, productId, variantId || null, Number.isInteger(sortOrder) ? sortOrder : 0);
  } catch (error) {
    detail(id, `error=${encodeURIComponent(errorOf(error))}`);
  }
  detail(id, "success=1");
}

export async function updateOutfitProductOrderAction(id: string, linkId: string, formData: FormData): Promise<void> {
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!Number.isInteger(sortOrder)) detail(id, `error=${encodeURIComponent("El orden debe ser un número entero.")}`);
  await updateOutfitProductOrder(await createSupabaseServerClient(), linkId, sortOrder);
  detail(id, "success=1");
}

export async function removeOutfitProductAction(id: string, linkId: string): Promise<void> {
  await removeOutfitProduct(await createSupabaseServerClient(), linkId);
  detail(id, "success=1");
}

export async function deleteOutfitAction(id: string, coverPath: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await deleteOutfit(supabase, id);
  await removeContentImage(supabase, coverPath);
  redirect("/admin/outfits?success=1");
}
