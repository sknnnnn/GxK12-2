import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniverseEntryBySlug } from "@/services/universe";
import { getProductDetailsByIds } from "@/services/catalog";
import { getCurrentOutfits } from "@/services/outfits";
import { formatDateAR } from "@/lib/datetime";
import { formatPrice } from "@/lib/format";
import { RichText } from "@/components/storefront/content/RichText";
import { VideoEmbed } from "@/components/storefront/content/VideoEmbed";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { OutfitCard } from "@/components/storefront/home/OutfitCard";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Universo — GXK" };

// Campaña / producción / temporada / colaboración / audiovisual (Bible §27:
// historia, foto, video, producto). Si hay stock, se compra desde acá; si un
// producto se agota, la historia sigue (Bible §26).
export default async function UniverseEntryPage({ params }: PageProps<"/universo/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const entry = await getUniverseEntryBySlug(supabase, slug);
  if (!entry) notFound();

  const [products, outfits] = await Promise.all([
    getProductDetailsByIds(supabase, entry.productIds),
    getCurrentOutfits(supabase, { ids: entry.outfitIds }),
  ]);
  const orderedProducts = entry.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <main className={styles.page}>
      <Link href="/universo">← Universo</Link>
      <p className={styles.kicker}>
        {entry.kindLabel} · {formatDateAR(entry.publishedAt)}
        {entry.membersOnly ? " · Members Only" : ""}
      </p>
      <h1>{entry.title}</h1>
      {entry.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
        <img src={entry.coverUrl} alt="" className={styles.cover} />
      )}
      {entry.summary && <p>{entry.summary}</p>}
      <RichText text={entry.body} />
      <VideoEmbed url={entry.videoUrl} title={entry.title} />
      {entry.media.length > 0 && (
        <div className={styles.gallery}>
          {entry.media.map((media) => (
            // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
            <img key={media.id} src={media.url} alt={media.altText ?? ""} />
          ))}
        </div>
      )}

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
    </main>
  );
}
