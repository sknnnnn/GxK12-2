import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCatalog, getPublishedCategories, parseCatalogParams } from "@/services/catalog";
import { HOME_LIMITS } from "@/lib/storefront/content";
import { CatalogView } from "@/components/storefront/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Buscar — GXK",
};

// BUSCAR (Bible §14). Misma búsqueda que la Tienda, con el foco en el campo.
// Sin término no se listan resultados: se muestra solo el buscador.
export default async function BuscarPage({ searchParams }: PageProps<"/buscar">) {
  const query = parseCatalogParams(await searchParams);
  const supabase = await createSupabaseServerClient();
  const [categories, result] = await Promise.all([
    getPublishedCategories(supabase),
    query.search
      ? getCatalog(supabase, query, { newestLimit: HOME_LIMITS.newArrivals })
      : Promise.resolve({ items: [], facets: { sizes: [], colors: [] } }),
  ]);

  return (
    <CatalogView
      basePath="/buscar"
      title="BUSCAR"
      query={query}
      result={result}
      categories={categories}
      autoFocusSearch={!query.search}
    />
  );
}
