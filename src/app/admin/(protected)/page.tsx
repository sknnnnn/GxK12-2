import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardSummary, getRecentOrders, getStockAlerts, LOW_STOCK_THRESHOLD, type StockAlertVariant } from "@/services/admin";
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

// Cuántas variantes listar por alerta de stock -- el resto se ve en
// Inventario con el mismo filtro (link "Ver todas").
const STOCK_ALERT_PREVIEW = 10;

// Filtros de Inventario equivalentes a las alertas del Dashboard: mismo
// universo (variantes activas) y misma regla de stock (LOW_STOCK_THRESHOLD,
// services/admin/inventory.ts) -- no se recalcula nada acá.
const INVENTORY_LOW_STOCK_HREF = "/admin/inventario?stock=low_stock&variante=activas&orden=stock_asc";
const INVENTORY_OUT_OF_STOCK_HREF = "/admin/inventario?stock=out_of_stock&variante=activas";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SectionError({ what }: { what: string }) {
  return (
    <p className={styles.errorState}>
      No se pudo cargar {what}. El resto del panel sigue disponible; recargá la página para reintentar.
    </p>
  );
}

function StockAlertList({ variants, showStock }: { variants: StockAlertVariant[]; showStock: boolean }) {
  return (
    <ul>
      {variants.slice(0, STOCK_ALERT_PREVIEW).map((variant, index) => (
        <li key={index}>
          <Link href={`/admin/productos/${variant.productId}`}>{variant.productName}</Link>
          {variant.variantLabel ? ` — ${variant.variantLabel}` : ""}
          {variant.sku ? ` (${variant.sku})` : ""}
          {showStock ? `: ${variant.stock} u.` : ""}
        </li>
      ))}
    </ul>
  );
}

// Dashboard: centro operativo de solo lectura. Datos reales de Supabase vía
// services/admin (gateados por RLS de la sesión del admin actual -- ver
// src/app/admin/(protected)/layout.tsx). Cada indicador accionable lleva al
// listado ya filtrado que lo explica. Cada bloque se carga por separado:
// si uno falla, se informa en ese bloque y el resto se muestra igual.
export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [summaryRes, recentOrdersRes, stockAlertsRes] = await Promise.allSettled([
    getDashboardSummary(supabase),
    getRecentOrders(supabase),
    getStockAlerts(supabase),
  ]);

  for (const result of [summaryRes, recentOrdersRes, stockAlertsRes]) {
    if (result.status === "rejected") console.error("[admin dashboard] error cargando datos:", result.reason);
  }

  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : null;
  const recentOrders = recentOrdersRes.status === "fulfilled" ? recentOrdersRes.value : null;
  const stockAlerts = stockAlertsRes.status === "fulfilled" ? stockAlertsRes.value : null;

  return (
    <div>
      <h1>Dashboard</h1>

      {summary ? (
        <div className={styles.summaryGrid}>
          <Link href="/admin/pedidos?pedido=payment_confirmed" className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Pedidos por preparar</span>
            <span className={styles.summaryValue}>{summary.paidAwaitingShipmentOrders}</span>
            <span className={styles.summaryNote}>Pago confirmado, todavía sin preparar</span>
          </Link>
          <Link href="/admin/envios" className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Envíos con incidencia</span>
            <span className={styles.summaryValue}>{summary.failedShipments}</span>
            <span className={styles.summaryNote}>Alta fallida en el proveedor, reintentable</span>
          </Link>
          <Link href="/admin/pedidos?pedido=pending_payment" className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Pedidos pendientes de pago</span>
            <span className={styles.summaryValue}>{summary.pendingPaymentOrders}</span>
            <span className={styles.summaryNote}>Stock reservado hasta que pague o venza</span>
          </Link>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Ventas totales</span>
            <span className={styles.summaryValue}>{formatPrice(summary.totalSalesAmount)}</span>
            <span className={styles.summaryNote}>Pedidos con pago confirmado o posterior</span>
          </div>
          <Link href={INVENTORY_LOW_STOCK_HREF} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Stock bajo</span>
            <span className={styles.summaryValue}>{summary.lowStockCount}</span>
            <span className={styles.summaryNote}>Variantes activas con 1 a {LOW_STOCK_THRESHOLD} u.</span>
          </Link>
          <Link href={INVENTORY_OUT_OF_STOCK_HREF} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Agotados</span>
            <span className={styles.summaryValue}>{summary.outOfStockCount}</span>
            <span className={styles.summaryNote}>Variantes activas sin stock</span>
          </Link>
        </div>
      ) : (
        <SectionError what="los indicadores" />
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pedidos recientes</h2>
          <Link href="/admin/pedidos">Ver todos los pedidos</Link>
        </div>
        {recentOrders === null ? (
          <SectionError what="los pedidos recientes" />
        ) : recentOrders.length === 0 ? (
          <p className={styles.emptyState}>Todavía no hay pedidos. Cuando alguien compre en la tienda, va a aparecer acá.</p>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/pedidos/${order.id}`}>{order.orderNumber}</Link>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.customerName ?? "—"}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>{ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                    <td>
                      {order.latestPaymentStatus
                        ? (PAYMENT_STATUS_LABELS[order.latestPaymentStatus] ?? order.latestPaymentStatus)
                        : "Sin intento de pago"}
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
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Stock</h2>
          <Link href="/admin/inventario">Ir a Inventario</Link>
        </div>
        {stockAlerts === null ? (
          <SectionError what="las alertas de stock" />
        ) : (
          <div className={styles.alertsGrid}>
            <div>
              <h3>Stock bajo (≤ {LOW_STOCK_THRESHOLD} unidades)</h3>
              {stockAlerts.lowStock.length === 0 ? (
                <p className={styles.emptyState}>Ninguna variante activa con stock bajo.</p>
              ) : (
                <>
                  <StockAlertList variants={stockAlerts.lowStock} showStock />
                  <Link href={INVENTORY_LOW_STOCK_HREF}>
                    Ver {stockAlerts.lowStock.length > STOCK_ALERT_PREVIEW ? `las ${stockAlerts.lowStock.length}` : "todas"} en Inventario
                  </Link>
                </>
              )}
            </div>
            <div>
              <h3>Agotados</h3>
              {stockAlerts.outOfStock.length === 0 ? (
                <p className={styles.emptyState}>Ninguna variante activa agotada.</p>
              ) : (
                <>
                  <StockAlertList variants={stockAlerts.outOfStock} showStock={false} />
                  <Link href={INVENTORY_OUT_OF_STOCK_HREF}>
                    Ver {stockAlerts.outOfStock.length > STOCK_ALERT_PREVIEW ? `las ${stockAlerts.outOfStock.length}` : "todas"} en Inventario
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
