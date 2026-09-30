// Site: configuración pública del sitio (site_settings, fila única) editable
// desde Admin: WhatsApp (Bible §22) y redes (Bible §35). NULL = no definido
// y la interfaz no lo muestra -- nunca se inventa un dato de contacto.
//
// Convención de GXK Core: recibe un GxkSupabaseClient ya construido.

import type { GxkSupabaseClient } from "@/lib/supabase/types";

export type SiteSettings = {
  whatsappNumber: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
};

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  whatsappNumber: null,
  instagramUrl: null,
  tiktokUrl: null,
};

export async function getSiteSettings(supabase: GxkSupabaseClient): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("whatsapp_number, instagram_url, tiktok_url")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_SITE_SETTINGS;
  return {
    whatsappNumber: data.whatsapp_number,
    instagramUrl: data.instagram_url,
    tiktokUrl: data.tiktok_url,
  };
}

export type SiteSettingsInput = { whatsappNumber: string; instagramUrl: string; tiktokUrl: string };

/** Valida el formulario de Admin. Vacío = no definido (null). */
export function parseSiteSettingsInput(input: SiteSettingsInput): { ok: true; value: SiteSettings } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const whatsapp = input.whatsappNumber.replace(/[\s+\-()]/g, "");
  if (whatsapp && !/^[0-9]{8,15}$/.test(whatsapp)) {
    errors.push("El WhatsApp debe ser el número internacional sin '+', ej. 5491122334455.");
  }
  const url = (value: string, label: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^https:\/\/\S+$/.test(trimmed)) errors.push(`${label} debe ser un enlace https://.`);
    return trimmed;
  };
  const instagramUrl = url(input.instagramUrl, "Instagram");
  const tiktokUrl = url(input.tiktokUrl, "TikTok");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { whatsappNumber: whatsapp || null, instagramUrl, tiktokUrl } };
}

export async function updateSiteSettings(
  supabase: GxkSupabaseClient,
  settings: SiteSettings,
): Promise<{ ok: true } | { ok: false; reason: "not_allowed" }> {
  const { data, error } = await supabase
    .from("site_settings")
    .update({
      whatsapp_number: settings.whatsappNumber,
      instagram_url: settings.instagramUrl,
      tiktok_url: settings.tiktokUrl,
    })
    .eq("id", true)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  return { ok: true };
}
