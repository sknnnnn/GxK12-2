"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { cartLineFromVariant } from "@/lib/cart/lines";
import { track } from "@/lib/analytics/track";
import { buildWhatsAppHref, productInquiryMessage } from "@/lib/storefront/whatsapp";
import type { CatalogProductDetail, CatalogVariant } from "@/services/catalog";
import { VariantSelector } from "./VariantSelector";
import { FavoriteButton } from "./FavoriteButton";
import styles from "./ProductPurchasePanel.module.css";

/**
 * Compra de un producto: talle/color (variantes reales), stock por
 * producto + color + talle (Bible §17: solo el booleano público, nunca el
 * conteo), agregar al carrito, favoritos y WhatsApp contextual con la
 * variante elegida (Bible §22). El precio que viaja al carrito es el de
 * catálogo; el checkout lo revalida server-side.
 */
export function ProductPurchasePanel({
  product,
  whatsappNumber,
}: {
  product: CatalogProductDetail;
  whatsappNumber: string | null;
}) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = !product.inStock;
  const canAdd = selectedVariant !== null && selectedVariant.inStock;

  function handleAdd() {
    if (!selectedVariant || !selectedVariant.inStock) return;
    addItem(cartLineFromVariant(product, selectedVariant));
    track("add_to_cart", { productId: product.id, quantity: 1 });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  const whatsappHref = whatsappNumber
    ? buildWhatsAppHref(
        whatsappNumber,
        productInquiryMessage({
          productName: product.name,
          color: selectedVariant?.color?.name,
          size: selectedVariant?.size?.name,
        }),
      )
    : null;

  return (
    <div className={styles.wrapper}>
      {soldOut && <p className={styles.soldOut}>Agotado</p>}
      <VariantSelector variants={product.variants} onSelectVariant={setSelectedVariant} />
      {selectedVariant?.priceOverride !== null && selectedVariant?.priceOverride !== undefined && (
        <p className={styles.variantPrice}>
          Precio de esta variante: {formatPrice(selectedVariant.priceOverride)}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={!canAdd} onClick={handleAdd}>
          {soldOut ? "Agotado" : justAdded ? "Agregado ✓" : "Agregar al carrito"}
        </button>
        <FavoriteButton productId={product.id} productName={product.name} />
      </div>
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}>
          Consultar por WhatsApp
        </a>
      )}
    </div>
  );
}
