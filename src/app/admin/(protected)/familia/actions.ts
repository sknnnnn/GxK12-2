"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { broadcastToMembers, parseCaminoSettingsInput, updateCaminoSettings } from "@/services/admin";

const BASE = "/admin/familia";
const fail = (message: string) => redirect(`${BASE}?error=${encodeURIComponent(message)}`);

export async function saveCaminoSettingsAction(formData: FormData): Promise<void> {
  const parsed = parseCaminoSettingsInput(formData);
  if (!parsed.ok) fail(parsed.error);
  else {
    const result = await updateCaminoSettings(await createSupabaseServerClient(), parsed.value);
    if (!result.ok) fail("No tenés permisos para editar el Camino.");
  }
  redirect(`${BASE}?success=1`);
}

export async function broadcastAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000) || null;
  const link = String(formData.get("link") ?? "").trim().slice(0, 300) || null;
  if (!title) fail("El título es obligatorio.");
  if (link && !/^(\/|https:\/\/)/.test(link)) fail("El link debe ser una ruta del sitio (/...) o https://.");
  let sent = 0;
  try {
    sent = await broadcastToMembers(await createSupabaseServerClient(), { title, body, link });
  } catch {
    fail("No se pudo enviar la comunicación.");
  }
  redirect(`${BASE}?success=1&enviadas=${sent}`);
}
