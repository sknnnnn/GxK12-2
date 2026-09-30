import { ProductCard } from "@/components/storefront/ProductCard";
import type { CatalogProductSummary } from "@/services/catalog";
import styles from "./sections.module.css";

// Cantidad provisoria de "Nuevos ingresos" en Home: no está definida en la
// Bible ni en el Roadmap; se ajusta con el diseño de Figma.
export const NEW_ARRIVALS_LIMIT = 8;

// Presentacional: recibe los productos ya cargados por la página
// (services/catalog getNewArrivals). Nombre de sección según Bible §15.
export function NewArrivalsSection({ products }: { products: CatalogProductSummary[] }) {
  return (
    <section className={styles.section} aria-labelledby="home-nuevos-ingresos">
      <h2 id="home-nuevos-ingresos">Nuevos ingresos</h2>
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
