import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminProducts, getCategoryOptions, PRODUCT_STATUSES, type ProductStatus } from "@/services/admin";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  discontinued: "Descontinuado",
};

function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

// Listado de productos: filtros son un <form method="get"> plano (sin JS,
// sin Client Component) -- la propia navegación de búsqueda actualiza los
// query params y esta página (Server Component) vuelve a consultar
// services/admin con los filtros ya resueltos.
export default async function AdminProductosPage(props: PageProps<"/admin/productos">) {
  const searchParams = await props.searchParams;

  const search = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const categoryId = typeof searchParams.categoria === "string" ? searchParams.categoria : undefined;
  const statusParam = typeof searchParams.estado === "string" ? searchParams.estado : undefined;
  const status = statusParam && isProductStatus(statusParam) ? statusParam : undefined;
  const outOfStock = searchParams.agotados === "1";
  const sortParam = typeof searchParams.orden === "string" ? searchParams.orden : undefined;
  const sort = (["updated_desc", "name_asc", "price_asc", "price_desc"] as const).includes(
    sortParam as "updated_desc" | "name_asc" | "price_asc" | "price_desc",
  )
    ? (sortParam as "updated_desc" | "name_asc" | "price_asc" | "price_desc")
    : "updated_desc";

  const supabase = await createSupabaseServerClient();
  const [products, categories] = await Promise.all([
    getAdminProducts(supabase, { search, categoryId, status, outOfStock, sort }),
    getCategoryOptions(supabase),
  ]);

  return (
    <div>
      <div className={styles.header}>
        <h1>Productos</h1>
        <Link href="/admin/productos/nuevo" className={styles.newButton}>
          Nuevo producto
        </Link>
      </div>

      <form method="get" className={styles.filters}>
        <label className={styles.filterField}>
          Buscar
          <input type="text" name="q" defaultValue={search ?? ""} placeholder="Nombre del producto" />
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
          Estado
          <select name="estado" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          Orden
          <select name="orden" defaultValue={sort}>
            <option value="updated_desc">Actualizado recientemente</option>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="price_asc">Precio (menor a mayor)</option>
            <option value="price_desc">Precio (mayor a menor)</option>
          </select>
        </label>

        <label className={styles.filterCheckbox}>
          <input type="checkbox" name="agotados" value="1" defaultChecked={outOfStock} />
          Solo agotados
        </label>

        <button type="submit" className={styles.applyButton}>
          Aplicar
        </button>
      </form>

      {products.length === 0 ? (
        <p className={styles.emptyState}>No hay productos que coincidan con estos filtros.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Variantes</th>
                <th>Stock</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que el storefront, ver services/catalog.
                      <img src={product.primaryImageUrl} alt={product.name} className={styles.thumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder} aria-hidden="true" />
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/productos/${product.id}`} className={styles.productName}>
                      {product.name}
                    </Link>
                  </td>
                  <td>{product.category?.name ?? "—"}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>
                    <span className={styles.badge}>{STATUS_LABELS[product.status] ?? product.status}</span>
                  </td>
                  <td>{product.variantCount}</td>
                  <td className={product.totalStock === 0 ? styles.outOfStock : undefined}>
                    {product.totalStock === 0 ? "Agotado" : `${product.totalStock} u.`}
                  </td>
                  <td>{new Date(product.updatedAt).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
