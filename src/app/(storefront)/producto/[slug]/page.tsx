import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/services/catalog";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

// Sin generateMetadata dinámico en esta etapa: requeriría una segunda
// consulta a Supabase con un cliente server distinto (no se dedupliría
// automáticamente contra la de la página) solo para el <title>. SEO/metadata
// queda para la etapa de diseño (ver ARCHITECTURE.md).
export default async function ProductoPage({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const product = await getProductBySlug(supabase, slug);

  if (!product) {
    notFound();
  }

  return (
    <main className={styles.main}>
      <div className={styles.gallery}>
        {product.images.length > 0 ? (
          product.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element -- sin next/image todavía: no hay bucket de Storage configurado, ver services/catalog.
            <img key={image.id} src={image.url} alt={image.altText ?? product.name} className={styles.image} />
          ))
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.infoHeader}>
          {product.category && <span className={styles.category}>{product.category.name}</span>}
        </div>
        <h1>{product.name}</h1>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        {product.description && <p className={styles.description}>{product.description}</p>}
        <AddToCartButton product={product} />
      </div>
    </main>
  );
}
