"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUSES, deleteRow, saveAdventure, saveChapter, saveSeason, SEASON_STATUSES } from "@/services/admin";
import { slugify } from "@/lib/slug";

function go(path: string, query: string): never {
  redirect(`${path}?${query}`);
}

function errorOf(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  if (message.includes("duplicate key")) return "Ya existe uno con ese número o slug.";
  if (message.includes("video_url")) return "El video debe ser un enlace https://.";
  return "No se pudo guardar. Revisá los datos.";
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function saveSeasonAction(id: string | null, formData: FormData): Promise<void> {
  const back = id ? `/admin/aventuras/${id}` : "/admin/aventuras";
  const number = Number(text(formData, "number"));
  const title = text(formData, "title");
  const status = text(formData, "status");
  if (!Number.isInteger(number) || number < 1) go(back, `error=${encodeURIComponent("El número de temporada debe ser un entero positivo.")}`);
  if (!title) go(back, `error=${encodeURIComponent("La temporada necesita un título.")}`);
  if (!(SEASON_STATUSES as readonly string[]).includes(status)) go(back, `error=${encodeURIComponent("Estado inválido.")}`);
  let savedId: string;
  try {
    savedId = await saveSeason(await createSupabaseServerClient(), id, {
      number,
      title,
      slug: slugify(text(formData, "slug") || `season-${String(number).padStart(2, "0")}`),
      summary: text(formData, "summary") || null,
      status: status as (typeof SEASON_STATUSES)[number],
    });
  } catch (error) {
    go(back, `error=${encodeURIComponent(errorOf(error))}`);
  }
  go(`/admin/aventuras/${savedId}`, "success=1");
}

export async function saveChapterAction(seasonId: string, id: string | null, formData: FormData): Promise<void> {
  const back = id ? `/admin/aventuras/capitulo/${id}` : `/admin/aventuras/${seasonId}`;
  const label = text(formData, "label");
  const title = text(formData, "title");
  const status = text(formData, "status");
  const sortOrder = Number(text(formData, "sortOrder") || 0);
  if (!label) go(back, `error=${encodeURIComponent("El capítulo necesita una etiqueta (ej. Ch.1).")}`);
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) go(back, `error=${encodeURIComponent("Estado inválido.")}`);
  try {
    await saveChapter(await createSupabaseServerClient(), seasonId, id, {
      label,
      title: title || null,
      slug: slugify(text(formData, "slug") || `${label} ${title}`),
      summary: text(formData, "summary") || null,
      status: status as (typeof CONTENT_STATUSES)[number],
      sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    });
  } catch (error) {
    go(back, `error=${encodeURIComponent(errorOf(error))}`);
  }
  go(back, "success=1");
}

export async function saveAdventureAction(chapterId: string, id: string | null, formData: FormData): Promise<void> {
  const back = `/admin/aventuras/capitulo/${chapterId}`;
  const title = text(formData, "title");
  const status = text(formData, "status");
  const videoUrl = text(formData, "videoUrl");
  const sortOrder = Number(text(formData, "sortOrder") || 0);
  if (!title) go(back, `error=${encodeURIComponent("La aventura necesita un título.")}`);
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) go(back, `error=${encodeURIComponent("Estado inválido.")}`);
  if (videoUrl && !/^https:\/\/\S+$/.test(videoUrl)) go(back, `error=${encodeURIComponent("El video debe ser un enlace https://.")}`);
  try {
    await saveAdventure(await createSupabaseServerClient(), chapterId, id, {
      title,
      body: text(formData, "body") || null,
      videoUrl: videoUrl || null,
      status: status as (typeof CONTENT_STATUSES)[number],
      sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    });
  } catch (error) {
    go(back, `error=${encodeURIComponent(errorOf(error))}`);
  }
  go(back, "success=1");
}

export async function deleteSeasonAction(id: string): Promise<void> {
  await deleteRow(await createSupabaseServerClient(), "adventure_seasons", id);
  go("/admin/aventuras", "success=1");
}

export async function deleteChapterAction(seasonId: string, id: string): Promise<void> {
  await deleteRow(await createSupabaseServerClient(), "adventure_chapters", id);
  go(`/admin/aventuras/${seasonId}`, "success=1");
}

export async function deleteAdventureAction(chapterId: string, id: string): Promise<void> {
  await deleteRow(await createSupabaseServerClient(), "adventures", id);
  go(`/admin/aventuras/capitulo/${chapterId}`, "success=1");
}
