import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import { HomeEntrySection } from "./HomeEntrySection";

// G & K (Bible §15, punto 5; §8, §28). G y K son anfitriones y narradores:
// su función en la web es conducir a Las Aventuras de G & K (Bloque 5). Sin
// contenido/diseño definido no se representan los personajes (nunca
// infantiles, rasgos propios: requieren dirección visual de Figma).
export function GKSection() {
  return <HomeEntrySection config={HOME_ENTRY_SECTIONS.gk} />;
}
