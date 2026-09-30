import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { conversionRate, getAnalyticsSummary } from "@/services/analytics";
import { formatPrice } from "@/lib/format";
import styles from "@/components/admin/admin.module.css";

const RANGES = [7, 30, 90] as const;

// Analytics (Bible §36): vistas, búsquedas, add to cart, abandono, ventas,
// conversión, outfits visitados/comprados, campañas que generan ventas,
// agotados y navegación.
export default async function AdminAnalyticsPage(props: PageProps<"/admin/analytics">) {
  const { dias } = await props.searchParams;
  const days = RANGES.find((range) => String(range) === dias) ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const summary = await getAnalyticsSummary(await createSupabaseServerClient(), from, to);
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

  const metrics: [string, string | number][] = [
    ["Sesiones", summary.sessions],
    ["Vistas de página", summary.page_views],
    ["Vistas de producto", summary.product_views],
    ["Búsquedas", summary.searches],
    ["Add to cart", summary.add_to_cart],
    ["Checkouts iniciados", summary.checkouts_started],
    ["Abandono de carrito (sesiones)", summary.cart_abandoned],
    ["Abandono de checkout (sesiones)", summary.checkout_abandoned],
    ["Pedidos creados", summary.orders_created],
    ["Ventas (pedidos pagados)", summary.orders_paid],
    ["Facturación (pagados)", formatPrice(Number(summary.revenue))],
    ["Conversión (sesiones con pedido)", pct(conversionRate(summary))],
  ];

  return (
    <div className={styles.page}>
      <h1>Analytics</h1>
      <nav className={styles.row} aria-label="Rango">
        {RANGES.map((range) => (
          <Link key={range} href={`/admin/analytics?dias=${range}`} className={range === days ? styles.button : styles.buttonSecondary}>
            {range} días
          </Link>
        ))}
      </nav>

      <section className={styles.card}>
        <h2>Resumen</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <tbody>
              {metrics.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Ranking title="Outfits visitados / comprados" head={["Outfit", "Vistas", "Add to cart", "Pedidos pagados"]}
        rows={summary.outfits.map((row) => [row.title, row.views, row.adds, row.orders_paid])} />
      <Ranking title="Campañas y contenido que generan ventas" head={["Entrada", "Vistas", "Pedidos pagados"]}
        rows={summary.entries.map((row) => [row.title, row.views, row.orders_paid])} />
      <Ranking title="Productos" head={["Producto", "Vistas", "Add to cart"]}
        rows={summary.top_products.map((row) => [row.name, row.views, row.adds])} />
      <Ranking title="Búsquedas" head={["Búsqueda", "Veces"]} rows={summary.top_searches.map((row) => [row.query, row.n])} />
      <Ranking title="Navegación" head={["Página", "Vistas"]} rows={summary.top_paths.map((row) => [row.path, row.n])} />
      <Ranking title="Agotados (publicados sin stock)" head={["Producto"]} rows={summary.sold_out.map((row) => [row.name])} />
    </div>
  );
}

function Ranking({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.muted}>Sin datos en el rango.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {head.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
