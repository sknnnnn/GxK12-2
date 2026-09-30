import { formatPrice } from "@/lib/format";
import { buildTrackingTimeline, orderStatusLabel } from "@/lib/orders/status";
import type { OrderStatusView } from "@/services/orders";
import styles from "./OrderStatusPanel.module.css";

const DELIVERY_LABELS: Record<string, string> = {
  andreani: "Andreani",
  correo_argentino: "Correo Argentino",
  meeting_point: "Punto de encuentro",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/**
 * Estado del pedido para el comprador: tracking Nuevo → Pago confirmado →
 * Preparando → Despachado → Entregado (Bible §33), pagos y detalle.
 * Presentacional: todo sale de services/orders (relectura server-side).
 */
export function OrderStatusPanel({ order }: { order: OrderStatusView }) {
  const timeline = buildTrackingTimeline(order.status, order.history);
  const closed = ["cancelled", "refunded", "incidence"].includes(order.status);

  return (
    <div className={styles.panel}>
      <p className={styles.number}>
        Pedido <strong>{order.orderNumber}</strong>
      </p>

      <ol className={styles.timeline} aria-label="Seguimiento del pedido">
        {timeline.map((step) => (
          <li key={step.status} className={step.current ? styles.current : step.reached ? styles.reached : styles.pending}>
            <span>{step.label}</span>
            {step.at && step.reached && <time dateTime={step.at}>{dateFormatter.format(new Date(step.at))}</time>}
          </li>
        ))}
      </ol>

      {closed && (
        <p className={styles.alert} role="status">
          Estado: {orderStatusLabel(order.status)}.{" "}
          {order.status === "incidence" ? "Te vamos a contactar para resolverlo." : ""}
        </p>
      )}

      {order.status === "pending_payment" && (
        <p className={styles.note}>
          {order.paymentMethod === "cash"
            ? `Pagás ${formatPrice(order.total)} en efectivo en la entrega. El pedido se confirma cuando se registra el pago.`
            : order.latestPaymentStatus === "rejected"
              ? "El pago fue rechazado. Si querés, iniciá una nueva compra."
              : order.latestPaymentStatus
                ? "Estamos esperando la confirmación del pago."
                : "El pedido se confirma cuando se acredita el pago."}
        </p>
      )}

      <dl className={styles.details}>
        <dt>Entrega</dt>
        <dd>{DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</dd>
        {order.meetingPointDetails && (
          <>
            <dt>Punto de encuentro</dt>
            <dd className={styles.preLine}>{order.meetingPointDetails}</dd>
          </>
        )}
        {order.shipment?.trackingNumber && (
          <>
            <dt>Número de seguimiento</dt>
            <dd>
              {order.shipment.trackingNumber} ({DELIVERY_LABELS[order.shipment.provider] ?? order.shipment.provider})
            </dd>
          </>
        )}
        {order.balanceDue > 0 && !closed && (
          <>
            <dt>Saldo a pagar en la entrega</dt>
            <dd>{formatPrice(order.balanceDue)}</dd>
          </>
        )}
      </dl>

      <ul className={styles.lines}>
        {order.lines.map((line, index) => (
          <li key={index}>
            <span>
              {line.productName}
              {line.variantLabel ? ` (${line.variantLabel})` : ""} × {line.quantity}
            </span>
            <span>{formatPrice(line.lineSubtotal)}</span>
          </li>
        ))}
        <li>
          <span>Entrega</span>
          <span>{formatPrice(order.shippingCost)}</span>
        </li>
        <li className={styles.total}>
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </li>
      </ul>
    </div>
  );
}
