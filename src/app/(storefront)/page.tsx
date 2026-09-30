import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNewArrivals } from "@/services/catalog";
import { getCurrentOutfits } from "@/services/outfits";
import { HERO_MEDIA, HOME_LIMITS } from "@/lib/storefront/content";
import { HeroSection } from "@/components/storefront/home/HeroSection";
import { NewArrivalsSection } from "@/components/storefront/home/NewArrivalsSection";
import { OutfitsSection } from "@/components/storefront/home/OutfitsSection";
import { UniversoSection } from "@/components/storefront/home/UniversoSection";
import { GKSection } from "@/components/storefront/home/GKSection";
import { EventSection } from "@/components/storefront/home/EventSection";
import { MembersSection } from "@/components/storefront/home/MembersSection";
import styles from "./page.module.css";

// Home: composición de secciones independientes en el orden de la Bible §15.
// Header y footer los aporta el layout del Storefront. Datos reales de
// Supabase vía services/*; contenido/parámetros en lib/storefront/content.
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const [newArrivals, outfits] = await Promise.all([
    getNewArrivals(supabase, { limit: HOME_LIMITS.newArrivals }),
    getCurrentOutfits(supabase, { limit: HOME_LIMITS.outfits }),
  ]);

  // DEPENDENCIA (Bloque 5): no existe modelo de eventos todavía. Cuando
  // exista services/events, acá se carga el próximo evento; null = no hay.
  const upcomingEvent = null;

  return (
    <main className={styles.main}>
      <HeroSection media={HERO_MEDIA} />
      <NewArrivalsSection products={newArrivals} />
      <OutfitsSection outfits={outfits} />
      <UniversoSection />
      <GKSection />
      <EventSection event={upcomingEvent} />
      <MembersSection />
    </main>
  );
}
