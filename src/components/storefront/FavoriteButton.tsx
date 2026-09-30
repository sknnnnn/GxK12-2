"use client";

import { useFavorites } from "@/lib/favorites/FavoritesProvider";
import styles from "./FavoriteButton.module.css";

export function FavoriteButton({ productId, productName, className }: { productId: string; productName: string; className?: string }) {
  const { has, toggle, hydrated } = useFavorites();
  const active = hydrated && has(productId);
  return (
    <button
      type="button"
      className={`${styles.button} ${className ?? ""}`}
      aria-pressed={active}
      aria-label={active ? `Quitar ${productName} de favoritos` : `Guardar ${productName} en favoritos`}
      onClick={() => toggle(productId)}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
