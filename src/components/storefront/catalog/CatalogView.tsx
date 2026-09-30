import Link from "next/link";
import {
  CATALOG_SORTS,
  CATALOG_SORT_LABELS,
  NEW_CATEGORY_SLUG,
  catalogQueryToSearch,
  hasActiveFilters,
  type CatalogCategory,
  type CatalogQuery,
  type CatalogResult,
} from "@/services/catalog";
import { ProductCard } from "@/components/storefront/ProductCard";
import styles from "./CatalogView.module.css";

// Tienda (Bible §11): categorías NUEVO · [categorías del admin] · VER TODO,
// búsqueda y filtros talle / color / precio / disponibilidad + orden.
// Formularios GET: funcionan sin JavaScript y cada estado es una URL.
export function CatalogView({
  basePath,
  title,
  query,
  result,
  categories,
  autoFocusSearch = false,
}: {
  basePath: string;
  title: string;
  query: CatalogQuery;
  result: CatalogResult;
  categories: CatalogCategory[];
  autoFocusSearch?: boolean;
}) {
  const { items, facets } = result;
  const filtersActive = hasActiveFilters(query);
  const clearHref = `${basePath}${catalogQueryToSearch({ category: query.category })}`;

  const categoryLinks = [
    { slug: NEW_CATEGORY_SLUG, label: "NUEVO" },
    ...categories.map((category) => ({ slug: category.slug, label: category.name })),
    { slug: "", label: "VER TODO" },
  ];

  return (
    <main className={styles.main}>
      <h1>{title}</h1>

      <nav className={styles.categoryNav} aria-label="Categorías">
        {categoryLinks.map((link) => {
          const active = (query.category ?? "") === link.slug;
          return (
            <Link
              key={link.slug || "ver-todo"}
              href={`/catalogo${catalogQueryToSearch({ category: link.slug || undefined })}`}
              className={active ? styles.categoryActive : styles.categoryLink}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <form action={basePath} method="get" role="search" className={styles.search}>
        {query.category && <input type="hidden" name="categoria" value={query.category} />}
        <label htmlFor="catalog-q" className={styles.srOnly}>
          Buscar
        </label>
        <input
          id="catalog-q"
          type="search"
          name="q"
          defaultValue={query.search ?? ""}
          placeholder="Buscar por nombre, tipo o color"
          autoFocus={autoFocusSearch}
        />
        <button type="submit">Buscar</button>
      </form>

      <details className={styles.filters} open={filtersActive}>
        <summary>Filtros y orden</summary>
        <form action={basePath} method="get" className={styles.filtersForm}>
          {query.category && <input type="hidden" name="categoria" value={query.category} />}
          {query.search && <input type="hidden" name="q" value={query.search} />}

          {facets.sizes.length > 0 && (
            <fieldset>
              <legend>Talle</legend>
              {facets.sizes.map((size) => (
                <label key={size.id} className={styles.check}>
                  <input type="checkbox" name="talle" value={size.id} defaultChecked={query.sizeIds?.includes(size.id)} />
                  {size.name}
                </label>
              ))}
            </fieldset>
          )}

          {facets.colors.length > 0 && (
            <fieldset>
              <legend>Color</legend>
              {facets.colors.map((color) => (
                <label key={color.id} className={styles.check}>
                  <input type="checkbox" name="color" value={color.id} defaultChecked={query.colorIds?.includes(color.id)} />
                  {color.name}
                </label>
              ))}
            </fieldset>
          )}

          <fieldset>
            <legend>Precio</legend>
            <label className={styles.price}>
              Desde
              <input type="number" name="min" min={0} inputMode="numeric" defaultValue={query.minPrice ?? ""} />
            </label>
            <label className={styles.price}>
              Hasta
              <input type="number" name="max" min={0} inputMode="numeric" defaultValue={query.maxPrice ?? ""} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Disponibilidad</legend>
            <label className={styles.check}>
              <input type="checkbox" name="stock" value="1" defaultChecked={query.inStockOnly} />
              Solo con stock
            </label>
          </fieldset>

          <label className={styles.sort}>
            Ordenar
            <select name="orden" defaultValue={query.sort ?? "nuevo"}>
              {CATALOG_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {CATALOG_SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.filterActions}>
            <button type="submit">Aplicar</button>
            {filtersActive && <Link href={clearHref}>Limpiar filtros</Link>}
          </div>
        </form>
      </details>

      <p className={styles.count} aria-live="polite">
        {items.length === 1 ? "1 producto" : `${items.length} productos`}
      </p>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {filtersActive
              ? "No encontramos productos con esa búsqueda o esos filtros."
              : query.category
                ? "No hay productos publicados en esta categoría todavía."
                : "Todavía no hay productos publicados."}
          </p>
          {filtersActive && <Link href={clearHref}>Limpiar filtros</Link>}
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
