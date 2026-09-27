import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOrders, ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus } from "@/services/admin";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  payment_confirmed: "Pago confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  incidence: "Incidencia",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  authorized: "Autorizado",
  in_process: "En proceso",
  in_mediation: "En mediación",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
};

const SHIPMENT_FILTERS = ["all", "none", "has_shipment"] as const;

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Listado de pedidos: mismo patrón que Productos/Inventario -- filtros son
// un <form method="get"> plano, la página (Server Component) hace todo el
// trabajo de datos vía services/admin.getAdminOrders.
export default async function AdminPedidosPage(props: PageProps<"/admin/pedidos">) {
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const paymentStatusParam = typeof searchParams.pago === "string" ? searchParams.pago : undefined;
  const paymentStatus = paymentStatusParam && (PAYMENT_STATUSES as readonly string[]).includes(paymentStatusParam)
    ? paymentStatusParam
    : undefined;

  const orderStatusParam = typeof searchParams.pedido === "string" ? searchParams.pedido : undefined;
  const orderStatus = orderStatusParam && isOrderStatus(orderStatusParam) ? orderStatusParam : undefined;

  const shipmentParam = typeof searchParams.envio === "string" ? searchParams.envio : undefined;
  const shipmentFilter = (SHIPMENT_FILTERS as readonly string[]).includes(shipmentParam ?? "")
    ? (shipmentParam as (typeof SHIPMENT_FILTERS)[number])
    : "all";

  const supabase = await createSupabaseServerClient();
  const orders = await getAdminOrders(supabase, { search, paymentStatus, orderStatus, shipmentFilter });

  return (
    <div>
      <div className={styles.header}>
        <h1>Pedidos</h1>
      </div>

      <form method="get" className={styles.filters}>
        <label className={styles.filterField}>
          Buscar
          <input type="text" name="q" defaultValue={search ?? ""} placeholder="N° de pedido, cliente o email" />
        </label>

        <label className={styles.filterField}>
          Estado de pago
          <select name="pago" defaultValue={paymentStatus ?? ""}>
            <option value="">Todos</option>
            {PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          Estado del pedido
          <select name="pedido" defaultValue={orderStatus ?? ""}>
            <option value="">Todos</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          Estado del envío
          <select name="envio" defaultValue={shipmentFilter}>
            <option value="all">Todos</option>
            <option value="none">Sin envío</option>
            <option value="has_shipment">Con envío</option>
          </select>
        </label>

        <button type="submit" className={styles.applyButton}>
          Aplicar
        </button>
      </form>

      {orders.length === 0 ? (
        <p className={styles.emptyState}>No hay pedidos que coincidan con estos filtros.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Email</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Pedido</th>
                <th>Envío</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderNumber}>{order.orderNumber}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.customerName}</td>
                  <td>{order.customerEmail}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    {order.latestPaymentStatus ? (
                      <span className={styles.badge}>
                        {PAYMENT_STATUS_LABELS[order.latestPaymentStatus] ?? order.latestPaymentStatus}
                      </span>
                    ) : (
                      <span className={styles.muted}>Sin intento de pago</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.badge}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                  </td>
                  <td>
                    {order.hasShipment ? (
                      <span className={styles.badge}>{order.shipmentStatus ?? "Sin estado"}</span>
                    ) : (
                      <span className={styles.muted}>Sin envío</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/pedidos/${order.id}`}>Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
