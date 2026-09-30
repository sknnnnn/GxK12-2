import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNewArrivals } from "@/services/catalog";
import { getCurrentOutfits } from "@/services/outfits";
import { CartLink } from "@/components/storefront/CartLink";
import { HeroSection } from "@/components/storefront/home/HeroSection";
import { NEW_ARRIVALS_LIMIT, NewArrivalsSection } from "@/components/storefront/home/NewArrivalsSection";
import { OutfitsSection } from "@/components/storefront/home/OutfitsSection";
import { UniversoSection } from "@/components/storefront/home/UniversoSection";
import { GKSection } from "@/components/storefront/home/GKSection";
import { EventSection } from "@/components/storefront/home/EventSection";
import { MembersSection } from "@/components/storefront/home/MembersSection";
import styles from "./page.module.css";

// Home: composición de secciones independientes en el orden conceptual de la
// Bible §15. Cada sección recibe sus datos ya cargados (datos reales de
// Supabase vía services/*). Las secciones sin contenido o sin bloque todavía
// (Hero, Universo, G & K, Evento, Members Only) no renderizan nada: ver cada
// componente. Header/footer definitivos y estilos finales: Figma (Bloque 1).
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const [newArrivals, outfits] = await Promise.all([
    getNewArrivals(supabase, { limit: NEW_ARRIVALS_LIMIT }),
    getCurrentOutfits(supabase),
  ]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>GXK</h1>
        <nav className={styles.headerNav} aria-label="Acceso rápido">
          <Link href="/catalogo">Catálogo</Link>
          <CartLink />
        </nav>
      </div>

      <HeroSection />
      <NewArrivalsSection products={newArrivals} />
      <OutfitsSection outfits={outfits} />
      <UniversoSection />
      <GKSection />
      <EventSection />
      <MembersSection />
    </main>
  );
}
