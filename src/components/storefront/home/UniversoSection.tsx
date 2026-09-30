import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import { HomeEntrySection } from "./HomeEntrySection";

// Universo (Bible §15, punto 4; §26). Entrada hacia UNIVERSO GXK 12:2. El
// sistema (campañas, producciones, temporadas, colaboraciones, audiovisual,
// Aventuras) es el Bloque 5: sin modelo de datos ni rutas todavía, así que
// acá solo vive la entrada, inerte hasta que exista la ruta.
export function UniversoSection() {
  return <HomeEntrySection config={HOME_ENTRY_SECTIONS.universo} />;
}
