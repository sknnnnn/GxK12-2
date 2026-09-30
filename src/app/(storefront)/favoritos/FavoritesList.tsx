"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/lib/favorites/FavoritesProvider";
import type { CatalogProductSummary } from "@/services/catalog";
import { ProductCard } from "@/components/storefront/ProductCard";
import { loadFavoriteProducts } from "./actions";
import styles from "./page.module.css";

export function FavoritesList() {
  const { ids, hydrated } = useFavorites();
  const [products, setProducts] = useState<CatalogProductSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = ids.join(",");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    loadFavoriteProducts(key ? key.split(",") : [])
      .then((result) => {
        if (!cancelled) {
          setProducts(result);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key, hydrated]);

  if (failed) return <p className={styles.state}>No pudimos cargar tus favoritos. Probá de nuevo en un momento.</p>;
  if (!hydrated || products === null) return <p className={styles.state}>Cargando favoritos…</p>;

  // Quitados desde esta misma página: se ocultan sin esperar otra carga.
  const visible = products.filter((product) => ids.includes(product.id));
  if (visible.length === 0) {
    return (
      <div className={styles.state}>
        <p>Todavía no guardaste favoritos.</p>
        <Link href="/catalogo">Ir a la tienda</Link>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {visible.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
