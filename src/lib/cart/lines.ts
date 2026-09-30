import type { CartLine } from "./types";
import type { CatalogProductDetail, CatalogVariant } from "@/services/catalog";

/**
 * Snapshot de carrito para una variante real de un producto del catálogo.
 * Único punto que arma una CartLine desde el catálogo (ficha de producto y
 * outfits). El precio es el de catálogo al momento de agregar; el checkout
 * lo revalida server-side.
 */
export function cartLineFromVariant(
  product: Pick<CatalogProductDetail, "id" | "slug" | "name" | "price" | "images">,
  variant: CatalogVariant,
): Omit<CartLine, "quantity"> {
  return {
    variantId: variant.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    size: variant.size?.name ?? null,
    color: variant.color?.name ?? null,
    sku: variant.sku,
    unitPrice: variant.priceOverride ?? product.price,
    imageUrl: product.images[0]?.url ?? null,
  };
}
