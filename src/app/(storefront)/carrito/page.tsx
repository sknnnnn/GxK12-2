import type { Metadata } from "next";
import { CartView } from "./CartView";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Carrito — GXK",
};

export default function CarritoPage() {
  return (
    <main className={styles.main}>
      <h1>CARRITO</h1>
      <CartView />
    </main>
  );
}
