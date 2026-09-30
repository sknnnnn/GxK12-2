import Link from "next/link";
import type { PublicOutfit } from "@/services/outfits";
import { OutfitCard } from "./OutfitCard";
import styles from "./sections.module.css";

// Presentacional: recibe los outfits vigentes ya cargados por la página
// (services/outfits getCurrentOutfits). Nombre según Bible §12/§15.
//
// Filtro por estilo (Bible §12: Street, Formal, Japanese, Y2K, Workwear):
// solo los estilos que tienen outfits vigentes. No hay página de detalle de
// outfit: todo funciona desde Home (OUTFITS apunta a /#outfits).
const STYLE_LABELS: Record<string, string> = { street: "Street", formal: "Formal", japanese: "Japanese", y2k: "Y2K", workwear: "Workwear" };

export function OutfitsSection({
  outfits,
  styles: outfitStyles = [],
  activeStyle = null,
}: {
  outfits: PublicOutfit[];
  styles?: string[];
  activeStyle?: string | null;
}) {
  return (
    <section id="outfits" className={styles.section} aria-labelledby="home-outfits">
      <h2 id="home-outfits">Ideas de outfits</h2>
      {outfitStyles.length > 1 && (
        <nav className={styles.entries} aria-label="Estilos">
          <Link href="/#outfits" aria-current={activeStyle ? undefined : "true"}>
            {activeStyle ? "Todos" : <strong>Todos</strong>}
          </Link>
          {outfitStyles.map((style) => (
            <Link key={style} href={`/?estilo=${style}#outfits`} aria-current={activeStyle === style ? "true" : undefined}>
              {activeStyle === style ? <strong>{STYLE_LABELS[style] ?? style}</strong> : (STYLE_LABELS[style] ?? style)}
            </Link>
          ))}
        </nav>
      )}
      {outfits.length === 0 ? (
        <p className={styles.empty}>Todavía no hay outfits publicados.</p>
      ) : (
        <div className={styles.grid}>
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </section>
  );
}
