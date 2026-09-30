"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addUniverseEntryMedia,
  checkImageUpload,
  CONTENT_STATUSES,
  createUniverseEntry,
  deleteUniverseEntry,
  deleteUniverseEntryMedia,
  linkUniverseEntryOutfit,
  linkUniverseEntryProduct,
  removeContentImage,
  UNIVERSE_KINDS,
  unlinkUniverseEntryOutfit,
  unlinkUniverseEntryProduct,
  updateUniverseEntry,
  uploadContentImage,
  type UniverseEntryInput,
} from "@/services/admin";
import { slugify } from "@/lib/slug";
import { localInputToIso } from "@/lib/datetime";

function detail(id: string, query: string): never {
  redirect(`/admin/universo/${id}?${query}`);
}

function errorOf(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  if (message.includes("duplicate key")) return "Ya existe una entrada con ese slug.";
  if (message.includes("video_url")) return "El video debe ser un enlace https://.";
  return "No se pudo guardar. Revisá los datos.";
}

function parseEntry(formData: FormData): { ok: true; input: UniverseEntryInput } | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim() || title);
  const kind = String(formData.get("kind") ?? "");
  const status = String(formData.get("status") ?? "draft");
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!title || !slug) return { ok: false, error: "La entrada necesita un título." };
  if (slug === "aventuras") return { ok: false, error: "El slug \"aventuras\" está reservado." };
  if (!(UNIVERSE_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Tipo inválido." };
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Estado inválido." };
  if (videoUrl && !/^https:\/\/\S+$/.test(videoUrl)) return { ok: false, error: "El video debe ser un enlace https://." };
  return {
    ok: true,
    input: {
      kind: kind as UniverseEntryInput["kind"],
      title,
      slug,
      summary: String(formData.get("summary") ?? "").trim() || null,
      body: String(formData.get("body") ?? "").trim() || null,
      videoUrl: videoUrl || null,
      status: status as UniverseEntryInput["status"],
      membersOnly: formData.get("membersOnly") === "on",
      publishedAt: localInputToIso(String(formData.get("publishedAt") ?? "")) ?? new Date().toISOString(),
      sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    },
  };
}

export async function createUniverseEntryAction(formData: FormData): Promise<void> {
  const parsed = parseEntry(formData);
  if (!parsed.ok) redirect(`/admin/universo?error=${encodeURIComponent(parsed.error)}`);
  let id: string;
  try {
    id = await createUniverseEntry(await createSupabaseServerClient(), parsed.input);
  } catch (error) {
    redirect(`/admin/universo?error=${encodeURIComponent(errorOf(error))}`);
  }
  detail(id, "success=1");
}

export async function updateUniverseEntryAction(id: string, formData: FormData): Promise<void> {
  const parsed = parseEntry(formData);
  if (!parsed.ok) detail(id, `error=${encodeURIComponent(parsed.error)}`);
  try {
    await updateUniverseEntry(await createSupabaseServerClient(), id, parsed.input);
  } catch (error) {
    detail(id, `error=${encodeURIComponent(errorOf(error))}`);
  }
  detail(id, "success=1");
}

export async function deleteUniverseEntryAction(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const paths = await deleteUniverseEntry(supabase, id);
  for (const path of paths) await removeContentImage(supabase, path);
  redirect("/admin/universo?success=1");
}

export async function addMediaAction(id: string, count: number, formData: FormData): Promise<void> {
  const check = checkImageUpload(formData.get("file"));
  if (!check) detail(id, `error=${encodeURIComponent("Elegí una imagen.")}`);
  if (!check.ok) detail(id, `error=${encodeURIComponent(check.error)}`);
  const supabase = await createSupabaseServerClient();
  try {
    const path = await uploadContentImage(supabase, `universe_entries/${id}/media`, check.file);
    await addUniverseEntryMedia(supabase, id, path, String(formData.get("altText") ?? "").trim() || null, count);
  } catch {
    detail(id, `error=${encodeURIComponent("No se pudo subir la imagen.")}`);
  }
  detail(id, "success=1");
}

export async function deleteMediaAction(id: string, mediaId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const path = await deleteUniverseEntryMedia(supabase, mediaId);
  await removeContentImage(supabase, path);
  detail(id, "success=1");
}

export async function linkProductAction(id: string, count: number, formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) detail(id, `error=${encodeURIComponent("Elegí un producto.")}`);
  await linkUniverseEntryProduct(await createSupabaseServerClient(), id, productId, count);
  detail(id, "success=1");
}

export async function unlinkProductAction(id: string, productId: string): Promise<void> {
  await unlinkUniverseEntryProduct(await createSupabaseServerClient(), id, productId);
  detail(id, "success=1");
}

export async function linkOutfitAction(id: string, count: number, formData: FormData): Promise<void> {
  const outfitId = String(formData.get("outfitId") ?? "");
  if (!outfitId) detail(id, `error=${encodeURIComponent("Elegí un outfit.")}`);
  await linkUniverseEntryOutfit(await createSupabaseServerClient(), id, outfitId, count);
  detail(id, "success=1");
}

export async function unlinkOutfitAction(id: string, outfitId: string): Promise<void> {
  await unlinkUniverseEntryOutfit(await createSupabaseServerClient(), id, outfitId);
  detail(id, "success=1");
}
