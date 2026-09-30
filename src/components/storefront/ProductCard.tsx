import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CatalogProductSummary } from "@/services/catalog";
import { FavoriteButton } from "./FavoriteButton";
import styles from "./ProductCard.module.css";

// Presentacional: recibe los datos ya cargados server-side por la página.
// El botón de favoritos es un hermano del link (no se anida un control
// interactivo dentro de un <a>).
export function ProductCard({ product }: { product: CatalogProductSummary }) {
  return (
    <article className={styles.card}>
      <Link href={`/producto/${product.slug}`} className={styles.link}>
        <div className={styles.imageWrapper}>
          {product.primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- sin next/image todavía: no hay bucket de Storage configurado, ver services/catalog.
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText ?? product.name}
              className={styles.image}
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true" />
          )}
          {!product.inStock && <span className={styles.badge}>Agotado</span>}
        </div>
        <div className={styles.info}>
          {product.category && <span className={styles.category}>{product.category.name}</span>}
          <h3 className={styles.name}>{product.name}</h3>
          {product.productType && <span className={styles.type}>{product.productType}</span>}
          <span className={styles.price}>{formatPrice(product.price)}</span>
        </div>
      </Link>
      <FavoriteButton productId={product.id} productName={product.name} className={styles.favorite} />
    </article>
  );
}
