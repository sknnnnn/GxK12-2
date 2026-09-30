// Outfits (Bible §12; Admin Bible §34): crear, editar, publicar/ocultar,
// portada, estilo, vigencia y productos (existentes, con variante opcional).
// Cliente de sesión: RLS admin_all_outfits / admin_all_outfit_products.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { buildImageUrl } from "@/services/catalog";

export const OUTFIT_STYLES = ["street", "formal", "japanese", "y2k", "workwear"] as const;
export type OutfitStyle = (typeof OUTFIT_STYLES)[number];
// Bible §12: Street, Formal, Japanese, Y2K, Workwear.
export const OUTFIT_STYLE_LABELS: Record<OutfitStyle, string> = {
  street: "Street",
  formal: "Formal",
  japanese: "Japanese",
  y2k: "Y2K",
  workwear: "Workwear",
};
export const OUTFIT_STATUSES = ["draft", "published", "hidden"] as const;
export type OutfitStatus = (typeof OUTFIT_STATUSES)[number];

export type AdminOutfitListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  style: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  productCount: number;
  coverUrl: string | null;
};

function coverUrl(supabase: GxkSupabaseClient, cover: string | null): string | null {
  if (!cover) return null;
  return /^https?:\/\//i.test(cover) ? cover : buildImageUrl(supabase, cover);
}

export async function getAdminOutfits(supabase: GxkSupabaseClient): Promise<AdminOutfitListItem[]> {
  const { data, error } = await supabase
    .from("outfits")
    .select("id, name, slug, status, style, starts_at, ends_at, sort_order, cover_image, outfit_products ( id )")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        name: string;
        slug: string;
        status: string;
        style: string | null;
        starts_at: string | null;
        ends_at: string | null;
        sort_order: number;
        cover_image: string | null;
        outfit_products: { id: string }[];
      }[]
    >();
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    style: row.style,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
    productCount: row.outfit_products.length,
    coverUrl: coverUrl(supabase, row.cover_image),
  }));
}

export type AdminOutfitDetail = AdminOutfitListItem & {
  description: string | null;
  coverPath: string | null;
  products: { linkId: string; productId: string; productName: string; variantId: string | null; variantLabel: string | null; sortOrder: number }[];
};

type OutfitDetailRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  style: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  cover_image: string | null;
  outfit_products: {
    id: string;
    product_id: string;
    variant_id: string | null;
    sort_order: number;
    products: { name: string } | null;
    product_variants: { sizes: { name: string } | null; colors: { name: string } | null } | null;
  }[];
};

export async function getAdminOutfit(supabase: GxkSupabaseClient, id: string): Promise<AdminOutfitDetail | null> {
  const { data, error } = await supabase
    .from("outfits")
    .select(
      "id, name, slug, description, status, style, starts_at, ends_at, sort_order, cover_image, outfit_products ( id, product_id, variant_id, sort_order, products ( name ), product_variants ( sizes ( name ), colors ( name ) ) )",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<OutfitDetailRow>();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    status: data.status,
    style: data.style,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    sortOrder: data.sort_order,
    coverPath: data.cover_image,
    coverUrl: coverUrl(supabase, data.cover_image),
    productCount: data.outfit_products.length,
    products: [...data.outfit_products]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => ({
        linkId: link.id,
        productId: link.product_id,
        productName: link.products?.name ?? "—",
        variantId: link.variant_id,
        variantLabel: link.product_variants
          ? [link.product_variants.sizes?.name, link.product_variants.colors?.name].filter(Boolean).join(" / ") || null
          : null,
        sortOrder: link.sort_order,
      })),
  };
}

export type OutfitInput = {
  name: string;
  slug: string;
  description: string | null;
  style: OutfitStyle | null;
  status: OutfitStatus;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

function toRow(input: OutfitInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    style: input.style,
    status: input.status,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    sort_order: input.sortOrder,
  };
}

export async function createOutfit(supabase: GxkSupabaseClient, input: OutfitInput): Promise<string> {
  const { data, error } = await supabase.from("outfits").insert(toRow(input)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateOutfit(supabase: GxkSupabaseClient, id: string, input: OutfitInput): Promise<void> {
  const { error } = await supabase.from("outfits").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function setOutfitCover(supabase: GxkSupabaseClient, id: string, path: string | null): Promise<void> {
  const { error } = await supabase.from("outfits").update({ cover_image: path }).eq("id", id);
  if (error) throw error;
}

export async function deleteOutfit(supabase: GxkSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) throw error;
}

export async function addOutfitProduct(
  supabase: GxkSupabaseClient,
  outfitId: string,
  productId: string,
  variantId: string | null,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from("outfit_products")
    .insert({ outfit_id: outfitId, product_id: productId, variant_id: variantId, sort_order: sortOrder });
  if (error) throw error;
}

export async function updateOutfitProductOrder(supabase: GxkSupabaseClient, linkId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from("outfit_products").update({ sort_order: sortOrder }).eq("id", linkId);
  if (error) throw error;
}

export async function removeOutfitProduct(supabase: GxkSupabaseClient, linkId: string): Promise<void> {
  const { error } = await supabase.from("outfit_products").delete().eq("id", linkId);
  if (error) throw error;
}

/** Productos (todos, cualquier estado) con sus variantes, para asociar a outfits y contenido. */
export async function getProductPickerOptions(
  supabase: GxkSupabaseClient,
): Promise<{ id: string; name: string; status: string; variants: { id: string; label: string }[] }[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, status, product_variants ( id, is_active, sizes ( name ), colors ( name ) )")
    .order("name")
    .returns<
      {
        id: string;
        name: string;
        status: string;
        product_variants: { id: string; is_active: boolean; sizes: { name: string } | null; colors: { name: string } | null }[];
      }[]
    >();
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    variants: row.product_variants
      .filter((variant) => variant.is_active)
      .map((variant) => ({ id: variant.id, label: [variant.sizes?.name, variant.colors?.name].filter(Boolean).join(" / ") || "Única" })),
  }));
}
