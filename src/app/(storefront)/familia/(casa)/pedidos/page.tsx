import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/familia/session";
import { getMemberOrders } from "@/services/familia";
import { orderStatusLabel } from "@/lib/orders/status";
import { formatPrice } from "@/lib/format";
import { formatDateAR } from "@/lib/datetime";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Mis pedidos — Familia GxK",
};

// Mis pedidos: todas las compras hechas con el email de la cuenta, con o sin sesión.
export default async function MisPedidosPage() {
  const { member } = await requireMember();
  const orders = await getMemberOrders(createSupabaseAdminClient(), member.email);
  return (
    <>
      <h1>MIS PEDIDOS</h1>
      {orders.length === 0 ? (
        <p className={styles.muted}>
          Todavía no hay pedidos con {member.email}. <Link href="/catalogo">Ir a la tienda</Link>
        </p>
      ) : (
        <ul className={styles.list}>
          {orders.map((order) => (
            <li key={order.orderNumber} className={styles.card}>
              <div className={styles.row}>
                <Link href={`/familia/pedidos/${order.orderNumber}`}>{order.orderNumber}</Link>
                <span>{orderStatusLabel(order.status)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.muted}>{formatDateAR(order.createdAt)}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
