import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderByLookupToken, type OrderStatusView } from "@/services/orders";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

// Pantalla a la que Mercado Pago redirige al comprador (success/pending/
// failure apuntan todas acá, ver services/payments.createOrderPayment).
// A propósito NO lee ni confía en los query params que Mercado Pago agrega
// al volver (payment_id, status, etc. -- el comprador podría editarlos a
// mano en la barra de direcciones): el único dato propio es `token`, y todo
// lo que se muestra sale de una relectura real del pedido vía
// getOrderByLookupToken. El estado real lo escribe únicamente el webhook
// (src/app/api/mercado-pago/webhook), nunca este request.
function describeStatus(order: OrderStatusView): { title: string; message: string } {
  if (order.status === "payment_confirmed") {
    return { title: "¡Pago aprobado!", message: "Tu pedido fue confirmado. Ya estamos preparando tu compra." };
  }
  if (order.status === "refunded") {
    return { title: "Pedido reembolsado", message: "Este pedido fue reembolsado." };
  }
  if (order.status === "cancelled") {
    return { title: "Pedido cancelado", message: "Este pedido fue cancelado y el stock fue liberado." };
  }

  if (order.status === "pending_payment") {
    switch (order.latestPaymentStatus) {
      case "pending":
      case "in_process":
      case "authorized":
        return {
          title: "Pago en proceso",
          message: "Todavía estamos esperando la confirmación de tu pago. Podés volver a cargar esta página más tarde para ver el estado.",
        };
      case "rejected":
        return {
          title: "Pago rechazado",
          message: "Tu pago no pudo procesarse. Podés intentar de nuevo desde el link de pago o contactarnos.",
        };
      case "cancelled":
        return { title: "Pago cancelado", message: "El intento de pago fue cancelado." };
      case "in_mediation":
      case "charged_back":
        return { title: "Pago en revisión", message: "Tu pago está en revisión. Te contactaremos si necesitamos algo más." };
      case "approved":
        // No debería pasar (approved siempre confirma el pedido, ver
        // record_payment_result) -- cubierto de todas formas.
        return { title: "Confirmando pedido", message: "Tu pago fue aprobado, estamos terminando de confirmar tu pedido." };
      default:
        return {
          title: "Esperando confirmación de pago",
          message: "Todavía no recibimos la confirmación de tu pago. Si ya pagaste, esperá unos segundos y volvé a cargar esta página.",
        };
    }
  }

  return { title: "Pedido en curso", message: `Estado actual del pedido: ${order.status}.` };
}

export default async function CheckoutRetornoPage(props: PageProps<"/checkout/retorno">) {
  const searchParams = await props.searchParams;
  const tokenParam = searchParams.token;
  const rawToken = typeof tokenParam === "string" ? tokenParam : Array.isArray(tokenParam) ? tokenParam[0] : undefined;

  const order = rawToken ? await getOrderByLookupToken(createSupabaseAdminClient(), rawToken) : null;

  if (!order) {
    return (
      <main className={styles.main}>
        <h1>No encontramos tu pedido</h1>
        <p>El link no es válido o venció. Si acabás de pagar, escribinos indicando tu email para confirmar el estado.</p>
        <Link href="/catalogo">Volver al catálogo</Link>
      </main>
    );
  }

  const { title, message } = describeStatus(order);

  return (
    <main className={styles.main}>
      <h1>{title}</h1>
      <p className={styles.orderNumber}>{order.orderNumber}</p>
      <p>{message}</p>

      <ul className={styles.lines}>
        {order.lines.map((line, index) => (
          <li key={index} className={styles.line}>
            <div>
              <span>{line.productName}</span>
              {line.variantLabel && <span className={styles.variant}>{line.variantLabel}</span>}
              <span className={styles.variant}>Cantidad: {line.quantity}</span>
            </div>
            <span>{formatPrice(line.lineSubtotal)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.totals}>
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

      <Link href="/catalogo">Seguir comprando</Link>
    </main>
  );
}
