import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminOrderById, ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/services/admin";
import { formatPrice } from "@/lib/format";
import { updateOrderStatusAction } from "../actions";
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Detalle de pedido: resumen -> cliente -> productos -> totales -> pago ->
// entrega/envío, en ese orden de jerarquía (PRO-139 §12). Los datos de
// productos vienen de order_items (snapshot histórico) -- nunca del
// catálogo actual (ver services/admin/orders.getAdminOrderById).
export default async function AdminPedidoDetallePage(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const supabase = await createSupabaseServerClient();
  const order = await getAdminOrderById(supabase, id);

  if (!order) {
    notFound();
  }

  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = searchParams.success === "1";

  const allowedNext = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
  const latestPayment = order.payments[0] ?? null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <Link href="/admin/pedidos">← Volver a pedidos</Link>
          <h1>{order.orderNumber}</h1>
        </div>
        <span className={styles.orderDate}>{formatDateTime(order.createdAt)}</span>
      </div>

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      {showSuccess && <p className={styles.success}>Estado actualizado.</p>}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Estado del pedido</span>
          <span className={styles.badge}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Estado del pago</span>
          {latestPayment ? (
            <span className={styles.badge}>{PAYMENT_STATUS_LABELS[latestPayment.status] ?? latestPayment.status}</span>
          ) : (
            <span className={styles.muted}>Sin intento de pago</span>
          )}
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Estado del envío</span>
          {order.shipment ? (
            <span className={styles.badge}>{order.shipment.status ?? "Sin estado"}</span>
          ) : (
            <span className={styles.muted}>Sin envío</span>
          )}
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total</span>
          <span className={styles.summaryValue}>{formatPrice(order.total)}</span>
        </div>
      </div>

      {allowedNext.length > 0 ? (
        <div className={styles.transitions}>
          {allowedNext.map((nextStatus) => (
            <form key={nextStatus} action={updateOrderStatusAction.bind(null, order.id, nextStatus)}>
              <button type="submit" className={styles.transitionButton}>
                Marcar como {ORDER_STATUS_LABELS[nextStatus] ?? nextStatus}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className={styles.noTransitions}>No hay transiciones disponibles desde el estado actual.</p>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cliente</h2>
        <dl className={styles.definitionList}>
          <dt>Nombre</dt>
          <dd>{order.customer.name}</dd>
          <dt>Email</dt>
          <dd>{order.customer.email}</dd>
          <dt>Teléfono</dt>
          <dd>{order.customer.phone}</dd>
        </dl>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Productos</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Producto</th>
                <th>Variante</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos/Inventario, ver services/catalog.
                      <img src={item.primaryImageUrl} alt={item.productName} className={styles.thumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true" />
                    )}
                  </td>
                  <td>{item.productName}</td>
                  <td>{item.variantLabel ?? "—"}</td>
                  <td>{item.sku ?? "—"}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.unitPrice)}</td>
                  <td>{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.totalsBox}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Envío</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pago</h2>
        {order.payments.length === 0 ? (
          <p className={styles.emptyState}>Todavía no hay ningún intento de pago registrado.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>ID externo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.provider}</td>
                    <td>
                      <span className={styles.badge}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</span>
                    </td>
                    <td>
                      {payment.amount} {payment.currency}
                    </td>
                    <td>{payment.externalId ?? "—"}</td>
                    <td>{formatDateTime(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Entrega</h2>
        <dl className={styles.definitionList}>
          <dt>Método</dt>
          <dd>{order.shippingMethod}</dd>
          <dt>Dirección</dt>
          <dd>{order.shippingAddress.address ?? "—"}</dd>
          <dt>Localidad</dt>
          <dd>{order.shippingAddress.locality ?? "—"}</dd>
          <dt>Provincia</dt>
          <dd>{order.shippingAddress.province ?? "—"}</dd>
          <dt>Código postal</dt>
          <dd>{order.shippingAddress.postalCode ?? "—"}</dd>
        </dl>

        {order.shipment ? (
          <>
            <h3 className={styles.sectionTitle}>Envío</h3>
            <dl className={styles.definitionList}>
              <dt>Proveedor</dt>
              <dd>{order.shipment.provider}</dd>
              <dt>Tipo de destino</dt>
              <dd>{order.shipment.destinationType ?? "—"}</dd>
              <dt>Tracking</dt>
              <dd>{order.shipment.trackingNumber ?? "—"}</dd>
              <dt>Etiqueta</dt>
              <dd>
                {order.shipment.labelUrl ? (
                  <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer">
                    Ver etiqueta
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Costo</dt>
              <dd>{order.shipment.cost !== null ? formatPrice(order.shipment.cost) : "—"}</dd>
            </dl>
          </>
        ) : (
          <p className={styles.emptyState}>Todavía no hay ningún envío registrado para este pedido.</p>
        )}
      </section>
    </div>
  );
}
