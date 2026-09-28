import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminShippingOverview, SHIPMENT_STATUS_LABELS } from "@/services/shipping/shipments";
import styles from "../pedidos/page.module.css";
import detailStyles from "../pedidos/[id]/page.module.css";
import { retryShipmentAction } from "./actions";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Envíos (PRO-128): listado operativo mínimo -- incidencias (alta fallida,
// reintentable) y pedidos pagados sin envío. Sin diseño definitivo (Figma).
// El tracking se consulta en el sitio oficial de cada proveedor con el
// número guardado; no hay tracking público propio en esta etapa.
export default async function AdminEnviosPage(props: PageProps<"/admin/envios">) {
  const searchParams = await props.searchParams;
  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = searchParams.success === "envio";

  const supabase = await createSupabaseServerClient();
  const overview = await getAdminShippingOverview(supabase);

  return (
    <div>
      <div className={styles.header}>
        <h1>Envíos</h1>
      </div>

      {errorMessage && <p className={detailStyles.error}>{errorMessage}</p>}
      {showSuccess && <p className={detailStyles.success}>Envío dado de alta.</p>}

      <h2>Pedidos pagados sin envío</h2>
      {overview.paidWithoutShipment.length === 0 ? (
        <p className={styles.emptyState}>No hay pedidos pagados sin envío.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overview.paidWithoutShipment.map((order) => (
                <tr key={order.orderId}>
                  <td className={styles.orderNumber}>
                    <Link href={`/admin/pedidos/${order.orderId}`}>{order.orderNumber}</Link>
                  </td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <form action={retryShipmentAction.bind(null, order.orderId, "/admin/envios")}>
                      <button type="submit" className={styles.applyButton}>
                        Crear envío
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Envíos</h2>
      {overview.shipments.length === 0 ? (
        <p className={styles.emptyState}>Todavía no hay envíos registrados.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Tracking</th>
                <th>Intentos</th>
                <th>Último intento</th>
                <th>Incidencia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overview.shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td className={styles.orderNumber}>
                    <Link href={`/admin/pedidos/${shipment.orderId}`}>{shipment.orderNumber}</Link>
                  </td>
                  <td>{shipment.provider}</td>
                  <td>
                    <span className={styles.badge}>
                      {shipment.status ? (SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status) : "Sin estado"}
                    </span>
                  </td>
                  <td>{shipment.trackingNumber ?? "—"}</td>
                  <td>{shipment.attempts}</td>
                  <td>{formatDateTime(shipment.lastAttemptAt)}</td>
                  <td>{shipment.lastError ?? <span className={styles.muted}>—</span>}</td>
                  <td>
                    {shipment.status === "failed" && (
                      <form action={retryShipmentAction.bind(null, shipment.orderId, "/admin/envios")}>
                        <button type="submit" className={styles.applyButton}>
                          Reintentar
                        </button>
                      </form>
                    )}
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
