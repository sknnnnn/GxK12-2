import Link from "next/link";
import type { PublicOutfit } from "@/services/outfits";
import styles from "./sections.module.css";

// Presentacional: recibe los outfits vigentes ya cargados por la página
// (services/outfits getCurrentOutfits). Nombre según Bible §12/§15.
//
// Pendiente (otros bloques): no hay página de detalle de outfit ni acción
// "agregar el outfit completo" (Bible §12) — la card no enlaza a un outfit;
// cada pieza enlaza a su producto.
function OutfitCard({ outfit }: { outfit: PublicOutfit }) {
  return (
    <article className={styles.outfit}>
      {outfit.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard: sin next/image todavía.
        <img src={outfit.coverImageUrl} alt={outfit.name} className={styles.outfitCover} />
      ) : (
        <div className={styles.outfitCoverPlaceholder} aria-hidden="true" />
      )}
      <div className={styles.outfitInfo}>
        <h3 className={styles.outfitName}>{outfit.name}</h3>
        {outfit.description && <p className={styles.outfitDescription}>{outfit.description}</p>}
        <ul className={styles.outfitProducts}>
          {outfit.products.map(({ product, variantId }) => (
            <li key={`${product.id}:${variantId ?? ""}`}>
              <Link href={`/producto/${product.slug}`}>{product.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function OutfitsSection({ outfits }: { outfits: PublicOutfit[] }) {
  return (
    <section className={styles.section} aria-labelledby="home-outfits">
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
