import type { PublicOutfit } from "@/services/outfits";
import { OutfitCard } from "./OutfitCard";
import styles from "./sections.module.css";

// Presentacional: recibe los outfits vigentes ya cargados por la página
// (services/outfits getCurrentOutfits). Nombre según Bible §12/§15.
//
// Pendiente: los estilos de outfit (Street, Formal, Japanese, Y2K, Workwear;
// Bible §12) no tienen campo en el modelo actual, así que no hay filtro por
// estilo. Tampoco hay página de detalle de outfit: todo funciona desde Home.
export function OutfitsSection({ outfits }: { outfits: PublicOutfit[] }) {
  return (
    <section id="outfits" className={styles.section} aria-labelledby="home-outfits">
      <h2 id="home-outfits">Ideas de outfits</h2>
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
