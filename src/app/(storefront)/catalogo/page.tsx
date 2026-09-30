import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublishedCategories, getPublishedProducts } from "@/services/catalog";
import { ProductCard } from "@/components/storefront/ProductCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Catálogo — GXK",
};

export default async function CatalogoPage({ searchParams }: PageProps<"/catalogo">) {
  const resolvedSearchParams = await searchParams;
  const categoriaParam = resolvedSearchParams.categoria;
  const categorySlug = typeof categoriaParam === "string" ? categoriaParam : undefined;

  const supabase = await createSupabaseServerClient();
  const [categories, products] = await Promise.all([
    getPublishedCategories(supabase),
    getPublishedProducts(supabase, { categorySlug }),
  ]);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Catálogo</h1>
      </div>

      {categories.length > 0 && (
        <nav className={styles.categoryNav} aria-label="Filtrar por categoría">
          <Link href="/catalogo" className={!categorySlug ? styles.categoryActive : styles.categoryLink}>
            Todas
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/catalogo?categoria=${category.slug}`}
              className={categorySlug === category.slug ? styles.categoryActive : styles.categoryLink}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className={styles.empty}>
          {categorySlug
            ? "No hay productos publicados en esta categoría todavía."
            : "Todavía no hay productos publicados."}
        </p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
