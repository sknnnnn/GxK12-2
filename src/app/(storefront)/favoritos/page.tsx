import type { Metadata } from "next";
import { FavoritesList } from "./FavoritesList";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Favoritos — GXK",
};

// FAVORITOS (Bible §14). Sin cuenta viven en este navegador; con Familia GxK
// se sincronizan con la cuenta (ver lib/favorites/FavoritesProvider).
export default function FavoritosPage() {
  return (
    <main className={styles.main}>
      <h1>FAVORITOS</h1>
      <FavoritesList />
    </main>
  );
}
