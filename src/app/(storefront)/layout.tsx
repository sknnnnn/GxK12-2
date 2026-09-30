import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart/CartProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_SITE_SETTINGS, getSiteSettings, type SiteSettings } from "@/services/site";
import { getCurrentMember } from "@/services/familia";
import { FamiliaFavoritesProvider } from "@/components/storefront/FamiliaFavoritesProvider";
import { PageViewTracker } from "@/components/storefront/analytics/Track";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { SiteFooter } from "@/components/storefront/SiteFooter";

// La configuración del sitio no es crítica para navegar: si no se puede
// leer, el footer simplemente no muestra redes/WhatsApp.
// El cliente (cookies) se crea fuera del try: así Next detecta el uso
// dinámico y no se traga su señal de render dinámico.
async function loadSiteSettings(): Promise<{ settings: SiteSettings; isMember: boolean }> {
  const supabase = await createSupabaseServerClient();
  const [settings, member] = await Promise.all([
    getSiteSettings(supabase).catch((error) => {
      console.error("[storefront] no se pudo leer site_settings:", error);
      return EMPTY_SITE_SETTINGS;
    }),
    // Familia GxK: sin sesión (o con error) se navega igual, sin sincronizar favoritos.
    getCurrentMember(supabase).catch(() => null),
  ]);
  return { settings, isMember: member !== null };
}

// Escopa carrito y favoritos al Storefront: Admin Web (src/app/admin) no
// los monta. Header y footer (Bible §14, Roadmap Bloque 1) viven acá.
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const { settings, isMember } = await loadSiteSettings();
  return (
    <CartProvider>
      <FamiliaFavoritesProvider isMember={isMember}>
        <PageViewTracker />
        <SiteHeader />
        {children}
        <SiteFooter settings={settings} />
      </FamiliaFavoritesProvider>
    </CartProvider>
  );
}
