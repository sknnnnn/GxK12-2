import type { Metadata } from "next";
import { TrackingForm } from "./TrackingForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Seguimiento — GXK",
};

// Tracking (Bible §33): Nuevo → Pago confirmado → Preparando → Despachado → Entregado.
export default async function SeguimientoPage({ searchParams }: PageProps<"/seguimiento">) {
  const { pedido } = await searchParams;
  return (
    <main className={styles.main}>
      <h1>SEGUIMIENTO</h1>
      <TrackingForm defaultOrderNumber={typeof pedido === "string" ? pedido.slice(0, 40) : ""} />
    </main>
  );
}
