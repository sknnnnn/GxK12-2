import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CatalogProductSummary } from "@/services/catalog";
import styles from "./ProductCard.module.css";

// Presentacional, sin estado: recibe los datos ya cargados server-side por
// la página. No hace consultas propias a Supabase.
export function ProductCard({ product }: { product: CatalogProductSummary }) {
  return (
    <Link href={`/producto/${product.slug}`} className={styles.card}>
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
        {!product.inStock && <span className={styles.badge}>Sin stock</span>}
      </div>
      <div className={styles.info}>
        {product.category && <span className={styles.category}>{product.category.name}</span>}
        <h3 className={styles.name}>{product.name}</h3>
        <span className={styles.price}>{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
