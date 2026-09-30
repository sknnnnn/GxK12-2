import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import { HomeEntrySection } from "./HomeEntrySection";

// Members Only (Bible §15, punto 7; §23-§24): entrada a FAMILIA GxK, donde
// viven prelaunches, early access, beneficios, invitaciones y contenido
// exclusivo.
export function MembersSection({ description }: { description: string | null }) {
  return <HomeEntrySection config={HOME_ENTRY_SECTIONS.members} description={description} />;
}
