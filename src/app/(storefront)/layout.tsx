import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/CartProvider";
import { FavoritesProvider } from "@/lib/favorites/FavoritesProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_SITE_SETTINGS, getSiteSettings, type SiteSettings } from "@/services/site";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { SiteFooter } from "@/components/storefront/SiteFooter";

// La configuración del sitio no es crítica para navegar: si no se puede
// leer, el footer simplemente no muestra redes/WhatsApp.
// El cliente (cookies) se crea fuera del try: así Next detecta el uso
// dinámico y no se traga su señal de render dinámico.
async function loadSiteSettings(): Promise<SiteSettings> {
  const supabase = await createSupabaseServerClient();
  try {
    return await getSiteSettings(supabase);
  } catch (error) {
    console.error("[storefront] no se pudo leer site_settings:", error);
    return EMPTY_SITE_SETTINGS;
  }
}

// Escopa carrito y favoritos al Storefront: Admin Web (src/app/admin) no
// los monta. Header y footer (Bible §14, Roadmap Bloque 1) viven acá.
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const settings = await loadSiteSettings();
  return (
    <CartProvider>
      <FavoritesProvider>
        <SiteHeader />
        {children}
        <SiteFooter settings={settings} />
      </FavoritesProvider>
    </CartProvider>
  );
}
