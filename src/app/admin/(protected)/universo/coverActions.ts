"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkImageUpload, removeContentImage, setCover, setUniverseEntryCover, uploadContentImage } from "@/services/admin";

// Portadas de contenido (Universo, Aventuras, Eventos). `table` se valida
// contra una lista cerrada; la autorización real es RLS (admin_all_*).
const TABLES = ["universe_entries", "adventure_seasons", "adventure_chapters", "adventures", "events"] as const;
type CoverTable = (typeof TABLES)[number];

function safeReturn(returnTo: string): string {
  return returnTo.startsWith("/admin/") ? returnTo : "/admin";
}

export async function uploadCoverAction(table: CoverTable, id: string, previousPath: string | null, returnTo: string, formData: FormData): Promise<void> {
  const target = safeReturn(returnTo);
  if (!(TABLES as readonly string[]).includes(table)) redirect(target);
  const check = checkImageUpload(formData.get("file"));
  if (!check) redirect(`${target}?error=${encodeURIComponent("Elegí una imagen.")}`);
  if (!check.ok) redirect(`${target}?error=${encodeURIComponent(check.error)}`);
  const supabase = await createSupabaseServerClient();
  try {
    const path = await uploadContentImage(supabase, `${table}/${id}`, check.file);
    if (table === "universe_entries") await setUniverseEntryCover(supabase, id, path);
    else await setCover(supabase, table, id, path);
    await removeContentImage(supabase, previousPath);
  } catch {
    redirect(`${target}?error=${encodeURIComponent("No se pudo subir la imagen.")}`);
  }
  redirect(`${target}?success=1`);
}

export async function removeCoverAction(table: CoverTable, id: string, previousPath: string | null, returnTo: string): Promise<void> {
  const target = safeReturn(returnTo);
  if (!(TABLES as readonly string[]).includes(table)) redirect(target);
  const supabase = await createSupabaseServerClient();
  if (table === "universe_entries") await setUniverseEntryCover(supabase, id, null);
  else await setCover(supabase, table, id, null);
  await removeContentImage(supabase, previousPath);
  redirect(`${target}?success=1`);
}
