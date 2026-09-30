import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { CatalogProductSummary } from "@/services/catalog";
import styles from "./sections.module.css";

// Presentacional: recibe los productos ya cargados por la página
// (services/catalog getNewArrivals; la cantidad la define
// lib/storefront/content HOME_LIMITS). Nombre de sección según Bible §15.
// Cada card lleva al producto; "Ver todo" al catálogo (VER TODO, Bible §11).
export function NewArrivalsSection({ products }: { products: CatalogProductSummary[] }) {
  return (
    <section id="nuevos-ingresos" className={styles.section} aria-labelledby="home-nuevos-ingresos">
      <div className={styles.sectionHeader}>
        <h2 id="home-nuevos-ingresos">Nuevos ingresos</h2>
        <Link href="/catalogo">Ver todo</Link>
      </div>
      {products.length === 0 ? (
        <p className={styles.empty}>Todavía no hay productos publicados.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
