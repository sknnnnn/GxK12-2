"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartProvider";
import { cartLineFromVariant } from "@/lib/cart/lines";
import type { CatalogProductDetail, CatalogVariant } from "@/services/catalog";
import { VariantSelector } from "./VariantSelector";
import styles from "./AddToCartButton.module.css";

/**
 * Conecta el selector de variantes (talle/color) con el carrito. Solo deja
 * agregar cuando `selectedVariant` es una variante real y disponible:
 * VariantSelector únicamente resuelve variantes que existen de verdad en
 * `product.variants` (datos reales del catálogo, ya filtrados por RLS
 * pública) y expone `inStock` -- no hay forma de que este botón agregue
 * una variante inexistente, inactiva o agotada. El precio que viaja al
 * carrito es el real del catálogo al momento de agregar (priceOverride de
 * la variante si existe, si no el precio base del producto); igual que
 * cualquier dato del carrito, el checkout deberá revalidarlo server-side
 * antes de cobrar (ver src/services/cart CartItemInput).
 */
export function AddToCartButton({ product }: { product: CatalogProductDetail }) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const canAdd = selectedVariant !== null && selectedVariant.inStock;

  function handleAdd() {
    if (!selectedVariant || !selectedVariant.inStock) return;

    addItem(cartLineFromVariant(product, selectedVariant));

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className={styles.wrapper}>
      <VariantSelector variants={product.variants} onSelectVariant={setSelectedVariant} />
      <button type="button" className={styles.button} disabled={!canAdd} onClick={handleAdd}>
        {justAdded ? "Agregado ✓" : "Agregar al carrito"}
      </button>
    </div>
  );
}
