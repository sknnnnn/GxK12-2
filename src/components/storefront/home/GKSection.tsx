import Link from "next/link";
import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import type { AdventureSeason } from "@/services/universe";
import { HomeEntrySection } from "./HomeEntrySection";

// G & K (Bible §15, punto 5; §8, §28): anfitriones y narradores; su historia
// son Las Aventuras de G & K. Se muestran las temporadas publicadas. La
// representación visual de los personajes queda para la dirección de Figma.
export function GKSection({ seasons, description }: { seasons: AdventureSeason[]; description: string | null }) {
  return (
    <HomeEntrySection config={HOME_ENTRY_SECTIONS.gk} description={description}>
      {seasons.length > 0 && (
        <ul>
          {seasons.map((season) => (
            <li key={season.id}>
              {season.comingSoon ? (
                <span>Season {String(season.number).padStart(2, "0")} — coming soon</span>
              ) : (
                <Link href="/universo/aventuras">
                  Season {String(season.number).padStart(2, "0")} — {season.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </HomeEntrySection>
  );
}
