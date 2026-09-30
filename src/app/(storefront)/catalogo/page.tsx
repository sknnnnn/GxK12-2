import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NEW_CATEGORY_SLUG, getCatalog, getPublishedCategories, parseCatalogParams } from "@/services/catalog";
import { HOME_LIMITS } from "@/lib/storefront/content";
import { CatalogView } from "@/components/storefront/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Tienda — GXK",
};

// TIENDA (Bible §11/§14). NUEVO es el mismo conjunto que "Nuevos ingresos"
// de Home (HOME_LIMITS.newArrivals).
export default async function CatalogoPage({ searchParams }: PageProps<"/catalogo">) {
  const query = parseCatalogParams(await searchParams);
  const supabase = await createSupabaseServerClient();
  const [categories, result] = await Promise.all([
    getPublishedCategories(supabase),
    getCatalog(supabase, query, { newestLimit: HOME_LIMITS.newArrivals }),
  ]);

  const title =
    query.category === NEW_CATEGORY_SLUG
      ? "NUEVO"
      : (categories.find((category) => category.slug === query.category)?.name ?? "TIENDA");

  return <CatalogView basePath="/catalogo" title={title} query={query} result={result} categories={categories} />;
}
