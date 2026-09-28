import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCategoryOptions,
  getInventoryItems,
  PRODUCT_STATUSES,
  type ProductStatus,
  type StockStatus,
} from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { updateStockAction } from "./actions";
import styles from "./page.module.css";

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  discontinued: "Descontinuado",
};

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out_of_stock: "Agotado",
  low_stock: "Stock bajo",
  in_stock: "Disponible",
};

const STOCK_STATUS_BADGE_CLASS: Record<StockStatus, string> = {
  out_of_stock: styles.badgeOutOfStock,
  low_stock: styles.badgeLowStock,
  in_stock: styles.badgeInStock,
};

const STOCK_STATUSES = ["all", "out_of_stock", "low_stock", "in_stock"] as const;
const SORTS = ["product_asc", "stock_asc", "stock_desc"] as const;
// ?variante= (en español en la URL, como el resto de los filtros) -> InventoryFilters.variantActivity.
const VARIANT_ACTIVITY_PARAMS = { activas: "active", inactivas: "inactive" } as const;

function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

// Inventario: herramienta operativa de consulta + edición rápida de stock.
// No duplica el CRUD de Productos (talle/color/sku/precio/activo siguen
// viviendo solo ahí) -- filtros son un <form method="get"> plano igual que
// /admin/productos, y cada fila es su propio <form> contra updateStockAction.
export default async function AdminInventarioPage(props: PageProps<"/admin/inventario">) {
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const categoryId = typeof searchParams.categoria === "string" ? searchParams.categoria : undefined;
  const productStatusParam = typeof searchParams.estado === "string" ? searchParams.estado : undefined;
  const productStatus = productStatusParam && isProductStatus(productStatusParam) ? productStatusParam : undefined;

  const stockStatusParam = typeof searchParams.stock === "string" ? searchParams.stock : undefined;
  const stockStatus = (STOCK_STATUSES as readonly string[]).includes(stockStatusParam ?? "")
    ? (stockStatusParam as (typeof STOCK_STATUSES)[number])
    : "all";

  const variantParam = typeof searchParams.variante === "string" ? searchParams.variante : undefined;
  const variantActivity =
    variantParam === "activas" || variantParam === "inactivas" ? VARIANT_ACTIVITY_PARAMS[variantParam] : "all";

  const sortParam = typeof searchParams.orden === "string" ? searchParams.orden : undefined;
  const sort = (SORTS as readonly string[]).includes(sortParam ?? "") ? (sortParam as (typeof SORTS)[number]) : "product_asc";

  const errorMessage = typeof searchParams.error === "string" ? searchParams.error : null;
  const showSuccess = searchParams.success === "1";

  const supabase = await createSupabaseServerClient();
  const [items, categories] = await Promise.all([
    getInventoryItems(supabase, { search, categoryId, productStatus, stockStatus, variantActivity, sort }),
    getCategoryOptions(supabase),
  ]);

  // Query string de esta misma vista (sin error/success) -- se manda como
  // campo oculto en cada form de stock para volver acá después de guardar.
  const returnParams = new URLSearchParams();
  if (search) returnParams.set("q", search);
  if (categoryId) returnParams.set("categoria", categoryId);
  if (productStatus) returnParams.set("estado", productStatus);
  if (stockStatus !== "all") returnParams.set("stock", stockStatus);
  if (variantParam && variantActivity !== "all") returnParams.set("variante", variantParam);
  if (sort !== "product_asc") returnParams.set("orden", sort);
  const returnQuery = returnParams.toString();

  return (
    <div>
      <div className={styles.header}>
        <h1>Inventario</h1>
      </div>

      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      {showSuccess && <p className={styles.success}>Stock actualizado.</p>}

      <form method="get" className={styles.filters}>
        <label className={styles.filterField}>
          Buscar
          <input type="text" name="q" defaultValue={search ?? ""} placeholder="Producto o SKU" />
        </label>

        <label className={styles.filterField}>
          Categoría
          <select name="categoria" defaultValue={categoryId ?? ""}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          Estado del producto
          <select name="estado" defaultValue={productStatus ?? ""}>
            <option value="">Todos</option>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PRODUCT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          Stock
          <select name="stock" defaultValue={stockStatus}>
            <option value="all">Todas</option>
            <option value="low_stock">Stock bajo</option>
            <option value="out_of_stock">Agotados</option>
            <option value="in_stock">Disponibles</option>
          </select>
        </label>

        <label className={styles.filterField}>
          Variante
          <select name="variante" defaultValue={variantActivity === "all" ? "" : variantParam}>
            <option value="">Todas</option>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
          </select>
        </label>

        <label className={styles.filterField}>
          Orden
          <select name="orden" defaultValue={sort}>
            <option value="product_asc">Producto (A-Z)</option>
            <option value="stock_asc">Stock (menor a mayor)</option>
            <option value="stock_desc">Stock (mayor a menor)</option>
          </select>
        </label>

        <button type="submit" className={styles.applyButton}>
          Aplicar
        </button>
      </form>

      {items.length === 0 ? (
        <p className={styles.emptyState}>
          No hay variantes que coincidan con estos filtros. <Link href="/admin/inventario">Quitar filtros</Link>
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Producto</th>
                <th>Talle</th>
                <th>Color</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Estado de stock</th>
                <th>Variante</th>
                <th>Editar stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.variantId}>
                  <td>
                    {item.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos, ver services/catalog.
                      <img src={item.primaryImageUrl} alt={item.productName} className={styles.thumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/productos/${item.productId}`} className={styles.productName}>
                      {item.productName}
                    </Link>
                  </td>
                  <td>{item.size?.name ?? "—"}</td>
                  <td>{item.color?.name ?? "—"}</td>
                  <td>{item.sku ?? "—"}</td>
                  <td>{item.stock}</td>
                  <td>
                    <span className={`${styles.badge} ${STOCK_STATUS_BADGE_CLASS[item.stockStatus]}`}>
                      {STOCK_STATUS_LABELS[item.stockStatus]}
                    </span>
                  </td>
                  <td>
                    <span className={item.isActive ? undefined : styles.badgeInactive}>
                      {item.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>
                    <form action={updateStockAction.bind(null, item.variantId)} className={styles.stockForm}>
                      <input type="hidden" name="returnQuery" value={returnQuery} />
                      <input type="number" name="stock" min="0" step="1" required defaultValue={item.stock} />
                      <SubmitButton className={styles.saveButton}>Guardar</SubmitButton>
                    </form>
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
