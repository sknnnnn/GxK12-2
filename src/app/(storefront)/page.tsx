import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFeaturedProducts, getPublishedCategories } from "@/services/catalog";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CartLink } from "@/components/storefront/CartLink";
import styles from "./page.module.css";

// Home: solo secciones respaldadas por datos reales y por servicios de
// catálogo existentes — categorías activas y productos publicados marcados
// como destacados (is_featured, editable desde Admin > Productos). La
// disponibilidad ("Sin stock") la resuelve ProductCard desde inStock.
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const [categories, featured] = await Promise.all([
    getPublishedCategories(supabase),
    getFeaturedProducts(supabase),
  ]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>GXK</h1>
        <CartLink />
      </div>

      {categories.length > 0 && (
        <section className={styles.section} aria-labelledby="home-categorias">
          <div className={styles.sectionHeader}>
            <h2 id="home-categorias">Categorías</h2>
            <Link href="/catalogo">Ver catálogo completo</Link>
          </div>
          <nav className={styles.categoryNav} aria-label="Categorías">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?categoria=${category.slug}`}
                className={styles.categoryLink}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </section>
      )}

      <section className={styles.section} aria-labelledby="home-destacados">
        <div className={styles.sectionHeader}>
          <h2 id="home-destacados">Destacados</h2>
          {categories.length === 0 && <Link href="/catalogo">Ver catálogo completo</Link>}
        </div>
        {featured.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay productos destacados. <Link href="/catalogo">Ver catálogo</Link>
          </p>
        ) : (
          <div className={styles.grid}>
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
