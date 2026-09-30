import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/services/familia";
import { getOrderByLookupToken } from "@/services/orders";
import { OrderStatusPanel } from "@/components/storefront/orders/OrderStatusPanel";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Confirmación — GXK",
};

// Paso 4 — Confirmación (Bible §32). También es la vuelta desde Mercado
// Pago: NO se confía en los query params que agrega Mercado Pago; todo sale
// de relectura real del pedido por el token (el estado lo escribe el webhook).
export default async function CheckoutRetornoPage({ searchParams }: PageProps<"/checkout/retorno">) {
  const { token } = await searchParams;
  const order =
    typeof token === "string" && /^[0-9a-f]{64}$/.test(token)
      ? await getOrderByLookupToken(createSupabaseAdminClient(), token)
      : null;
  const member = await getCurrentMember(await createSupabaseServerClient()).catch(() => null);

  return (
    <main className={styles.main}>
      <p className={styles.steps}>1. Datos · 2. Entrega · 3. Pago · <strong>4. Confirmación</strong></p>
      <h1>CONFIRMACIÓN</h1>
      {order ? (
        <>
          <OrderStatusPanel order={order} />
          <p className={styles.muted}>
            Podés seguir el pedido cuando quieras desde <Link href={`/seguimiento?pedido=${order.orderNumber}`}>Seguimiento</Link> con
            el número de pedido y tu email.
          </p>
          {member ? (
            <p className={styles.muted}>
              También lo ves en <Link href="/familia/pedidos">MI CASA</Link> y suma en <Link href="/familia/camino">Mi Camino 🐾</Link> cuando se confirma el pago.
            </p>
          ) : (
            <p className={styles.muted}>
              Registro opcional: <Link href="/familia/registro">sumate a FAMILIA GxK 🐾</Link> con el mismo email y tus compras confirmadas avanzan en el Camino G &amp; K.
            </p>
          )}
        </>
      ) : (
        <p className={styles.muted}>
          No encontramos el pedido. Si ya compraste, buscalo desde <Link href="/seguimiento">Seguimiento</Link>.
        </p>
      )}
    </main>
  );
}
