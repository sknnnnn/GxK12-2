import Link from "next/link";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { RelatedContent } from "@/services/universe";
import { getProductDetailsByIds } from "@/services/catalog";
import { getCurrentOutfits } from "@/services/outfits";
import { formatDateAR } from "@/lib/datetime";
import { formatPrice } from "@/lib/format";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { OutfitCard } from "@/components/storefront/home/OutfitCard";
import styles from "./content.module.css";

// Relaciones editoriales (Universo, Las Aventuras de G & K, eventos). Una
// entrada sin página pública aparece solo como contexto, sin link.
export function RelatedLinks({ related }: { related: Pick<RelatedContent, "entries" | "chapters" | "events"> }) {
  if (related.entries.length + related.chapters.length + related.events.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="relacionado">
      <h2 id="relacionado">Relacionado</h2>
      <ul>
        {related.entries.map((entry) => (
          <li key={entry.id}>
            {entry.kindLabel} · {entry.hasPage ? <Link href={`/universo/${entry.slug}`}>{entry.title}</Link> : entry.title}
          </li>
        ))}
        {related.chapters.map((chapter) => (
          <li key={chapter.id}>
            Las Aventuras de G &amp; K ·{" "}
            <Link href={chapter.href}>
              {chapter.label}
              {chapter.title ? ` ${chapter.title}` : ""}
            </Link>
          </li>
        ))}
        {related.events.map((event) => (
          <li key={event.id}>
            Evento · <Link href={`/eventos/${event.slug}`}>{event.title}</Link> — {formatDateAR(event.startsAt)}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Productos (comprables si hay stock; un agotado sigue visible) y outfits relacionados.
export async function RelatedShop({ supabase, productIds, outfitIds }: { supabase: GxkSupabaseClient; productIds: string[]; outfitIds: string[] }) {
  const [products, outfits] = await Promise.all([
    productIds.length ? getProductDetailsByIds(supabase, productIds) : Promise.resolve([]),
    outfitIds.length ? getCurrentOutfits(supabase, { ids: outfitIds }) : Promise.resolve([]),
  ]);
  const orderedProducts = productIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <>
      {orderedProducts.length > 0 && (
        <section className={styles.section} aria-labelledby="productos">
          <h2 id="productos">Productos</h2>
          <div className={styles.grid}>
            {orderedProducts.map((product) => (
              <div key={product.id} className={styles.card}>
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
                  <img src={product.images[0].url} alt={product.images[0].altText ?? product.name} className={styles.cardImage} />
                ) : (
                  <div className={styles.cardImagePlaceholder} aria-hidden="true" />
                )}
                <div className={styles.cardBody}>
                  <Link href={`/producto/${product.slug}`}>
                    <strong>{product.name}</strong>
                  </Link>
                  <span>{formatPrice(product.price)}</span>
                  <ProductPurchasePanel product={product} whatsappNumber={null} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outfits.length > 0 && (
        <section className={styles.section} aria-labelledby="outfits">
          <h2 id="outfits">Outfits</h2>
          <div className={styles.grid}>
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
