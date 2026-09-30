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
