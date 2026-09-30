import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import { HomeEntrySection } from "./HomeEntrySection";

// Members Only (Bible §15, punto 7; §23-§24). Entrada hacia FAMILIA GxK. El
// sistema (registro opcional, prelaunches, early access, beneficios,
// invitaciones, contenido exclusivo) es el Bloque 6: sin cuentas ni datos
// todavía, así que acá solo vive la entrada, inerte hasta que exista.
export function MembersSection() {
  return <HomeEntrySection config={HOME_ENTRY_SECTIONS.members} />;
}
