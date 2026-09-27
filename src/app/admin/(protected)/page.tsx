import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardSummary, getRecentOrders, getStockAlerts } from "@/services/admin";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Dashboard: solo lectura, datos reales de Supabase vía services/admin
// (gateados por RLS de la sesión del admin actual -- ver
// src/app/admin/(protected)/layout.tsx). Sin lógica de negocio acá, solo
// presentación de lo que ya calculó el servicio.
export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [summary, recentOrders, stockAlerts] = await Promise.all([
    getDashboardSummary(supabase),
    getRecentOrders(supabase),
    getStockAlerts(supabase),
  ]);

  return (
    <div>
      <h1>Dashboard</h1>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pedidos pendientes de pago</span>
          <span className={styles.summaryValue}>{summary.pendingPaymentOrders}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pedidos por despachar</span>
          <span className={styles.summaryValue}>{summary.paidAwaitingShipmentOrders}</span>
          <span className={styles.summaryNote}>Pago confirmado, sin integración de envíos activa todavía</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Ventas totales</span>
          <span className={styles.summaryValue}>{formatPrice(summary.totalSalesAmount)}</span>
          <span className={styles.summaryNote}>Pedidos con pago confirmado o posterior</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Stock bajo</span>
          <span className={styles.summaryValue}>{summary.lowStockCount}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Agotados</span>
          <span className={styles.summaryValue}>{summary.outOfStockCount}</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pedidos recientes</h2>
        {recentOrders.length === 0 ? (
          <p className={styles.emptyState}>Todavía no hay pedidos.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.orderNumber}>
                    <td>{order.orderNumber}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.customerName ?? "—"}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>{ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                    <td>
                      {order.latestPaymentStatus
                        ? (PAYMENT_STATUS_LABELS[order.latestPaymentStatus] ?? order.latestPaymentStatus)
                        : "Sin intento de pago"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stock</h2>
        <div className={styles.alertsGrid}>
          <div>
            <h3>Stock bajo (≤ 3 unidades)</h3>
            {stockAlerts.lowStock.length === 0 ? (
              <p className={styles.emptyState}>No hay productos con stock bajo.</p>
            ) : (
              <ul>
                {stockAlerts.lowStock.map((variant, index) => (
                  <li key={index}>
                    {variant.productName}
                    {variant.variantLabel ? ` — ${variant.variantLabel}` : ""} ({variant.stock} u.)
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Agotados</h3>
            {stockAlerts.outOfStock.length === 0 ? (
              <p className={styles.emptyState}>No hay productos agotados.</p>
            ) : (
              <ul>
                {stockAlerts.outOfStock.map((variant, index) => (
                  <li key={index}>
                    {variant.productName}
                    {variant.variantLabel ? ` — ${variant.variantLabel}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
