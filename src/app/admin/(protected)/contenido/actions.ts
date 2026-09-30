"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkImageUpload, removeContentImage, uploadContentImage } from "@/services/admin";
import { getSiteContent, updateSiteContent } from "@/services/site";

const BASE = "/admin/contenido";
const text = (formData: FormData, key: string, max = 20000) => String(formData.get(key) ?? "").trim().slice(0, max) || null;

export async function saveContentTextsAction(formData: FormData): Promise<void> {
  const result = await updateSiteContent(await createSupabaseServerClient(), {
    heroImageAlt: text(formData, "heroImageAlt", 200),
    universoDescription: text(formData, "universoDescription", 2000),
    gkDescription: text(formData, "gkDescription", 2000),
    membersDescription: text(formData, "membersDescription", 2000),
    aboutBody: text(formData, "aboutBody"),
    helpBody: text(formData, "helpBody"),
  });
  if (!result.ok) redirect(`${BASE}?error=${encodeURIComponent("No tenés permisos para editar el contenido.")}`);
  redirect(`${BASE}?success=1`);
}

export async function uploadHeroImageAction(formData: FormData): Promise<void> {
  const check = checkImageUpload(formData.get("file"));
  if (!check) redirect(`${BASE}?error=${encodeURIComponent("Elegí una imagen.")}`);
  if (!check.ok) redirect(`${BASE}?error=${encodeURIComponent(check.error)}`);
  const supabase = await createSupabaseServerClient();
  const previous = await getSiteContent(supabase);
  try {
    const path = await uploadContentImage(supabase, "home", check.file);
    await updateSiteContent(supabase, { heroImagePath: path });
    await removeContentImage(supabase, previous.heroImagePath);
  } catch {
    redirect(`${BASE}?error=${encodeURIComponent("No se pudo subir la imagen.")}`);
  }
  redirect(`${BASE}?success=1`);
}

export async function removeHeroImageAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const previous = await getSiteContent(supabase);
  await updateSiteContent(supabase, { heroImagePath: null });
  await removeContentImage(supabase, previous.heroImagePath);
  redirect(`${BASE}?success=1`);
}
