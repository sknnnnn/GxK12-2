import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildImageUrl, getNewArrivals } from "@/services/catalog";
import { getCurrentOutfits } from "@/services/outfits";
import { getAdventureSeasons, getNextEvent, getUniverseEntries } from "@/services/universe";
import { getSiteContent } from "@/services/site";
import { HOME_LIMITS } from "@/lib/storefront/content";
import { HeroSection } from "@/components/storefront/home/HeroSection";
import { NewArrivalsSection } from "@/components/storefront/home/NewArrivalsSection";
import { OutfitsSection } from "@/components/storefront/home/OutfitsSection";
import { UniversoSection } from "@/components/storefront/home/UniversoSection";
import { GKSection } from "@/components/storefront/home/GKSection";
import { EventSection } from "@/components/storefront/home/EventSection";
import { MembersSection } from "@/components/storefront/home/MembersSection";
import styles from "./page.module.css";

// Home: la puerta de la Casa GXK (Bible §15), en su orden conceptual:
// hero, nuevos ingresos, ideas de outfits, Universo, G & K, próximo evento
// (si existe) y Members Only. Datos reales vía services/*; textos e imagen
// del hero desde Admin > Contenido.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { estilo } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [newArrivals, allOutfits, content, universe, seasons, nextEvent] = await Promise.all([
    getNewArrivals(supabase, { limit: HOME_LIMITS.newArrivals }),
    getCurrentOutfits(supabase, { limit: HOME_LIMITS.outfits }),
    getSiteContent(supabase),
    getUniverseEntries(supabase, { limit: HOME_LIMITS.universo, membersOnly: false }),
    getAdventureSeasons(supabase),
    getNextEvent(supabase),
  ]);

  // Estilos de Ideas de outfits (Bible §12): se filtra sobre los vigentes.
  const outfitStyles = [...new Set(allOutfits.map((outfit) => outfit.style).filter((style): style is string => Boolean(style)))];
  const activeStyle = typeof estilo === "string" && outfitStyles.includes(estilo) ? estilo : null;
  const outfits = activeStyle ? allOutfits.filter((outfit) => outfit.style === activeStyle) : allOutfits;

  const heroMedia = content.heroImagePath
    ? { imageUrl: buildImageUrl(supabase, content.heroImagePath), alt: content.heroImageAlt ?? "" }
    : null;

  return (
    <main className={styles.main}>
      <HeroSection media={heroMedia} />
      <NewArrivalsSection products={newArrivals} />
      <OutfitsSection outfits={outfits} styles={outfitStyles} activeStyle={activeStyle} />
      <UniversoSection entries={universe} description={content.universoDescription} />
      <GKSection seasons={seasons} description={content.gkDescription} />
      <EventSection event={nextEvent} />
      <MembersSection description={content.membersDescription} />
    </main>
  );
}
