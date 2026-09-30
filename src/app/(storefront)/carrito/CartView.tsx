"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { cartLineFromVariant } from "@/lib/cart/lines";
import { formatPrice } from "@/lib/format";
import type { CatalogProductDetail } from "@/services/catalog";
import { loadCartProducts } from "./actions";
import styles from "./page.module.css";

function variantLabel(variant: CatalogProductDetail["variants"][number]): string {
  return [variant.size?.name, variant.color?.name].filter(Boolean).join(" / ") || "Única";
}

/**
 * Carrito (Bloque 3): resumen, cantidades y cambio de talle/color con los
 * datos públicos actuales. El carrito NO reserva stock (Bible §17): solo
 * avisa si algo ya no está disponible; precio y stock se revalidan en el
 * checkout antes de crear el pedido.
 */
export function CartView() {
  const { lines, increment, decrement, remove, replaceVariant, hydrated } = useCart();
  const [products, setProducts] = useState<Map<string, CatalogProductDetail> | null>(null);
  const productKey = [...new Set(lines.map((line) => line.productId))].sort().join(",");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    loadCartProducts(productKey ? productKey.split(",") : [])
      .then((result) => {
        if (!cancelled) setProducts(new Map(result.map((product) => [product.id, product])));
      })
      .catch(() => {
        if (!cancelled) setProducts(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [productKey, hydrated]);

  if (!hydrated) return <p className={styles.empty}>Cargando carrito…</p>;

  if (lines.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Tu carrito está vacío.</p>
        <Link href="/catalogo">Ir a la tienda</Link>
      </div>
    );
  }

  const rows = lines.map((line) => {
    const product = products?.get(line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    const currentPrice = variant ? (variant.priceOverride ?? product!.price) : line.unitPrice;
    const unavailable = products !== null && (!product || !variant || !variant.inStock);
    return { line, product, variant, currentPrice, unavailable };
  });

  const subtotal = rows.reduce((sum, row) => sum + row.currentPrice * row.line.quantity, 0);
  const hasUnavailable = rows.some((row) => row.unavailable);

  return (
    <>
      <ul className={styles.lines}>
        {rows.map(({ line, product, currentPrice, unavailable }) => (
          <li key={line.variantId} className={styles.line}>
            {line.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
              <img src={line.imageUrl} alt={line.productName} className={styles.image} />
            ) : (
              <div className={styles.imagePlaceholder} aria-hidden="true" />
            )}
            <div className={styles.info}>
              <Link href={`/producto/${line.productSlug}`} className={styles.name}>
                {line.productName}
              </Link>
              {product && product.variants.length > 1 ? (
                <label className={styles.variant}>
                  Talle / color
                  <select
                    value={line.variantId}
                    onChange={(event) => {
                      const next = product.variants.find((v) => v.id === event.target.value);
                      if (next) replaceVariant(line.variantId, cartLineFromVariant(product, next));
                    }}
                  >
                    {product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id} disabled={!variant.inStock && variant.id !== line.variantId}>
                        {variantLabel(variant)}
                        {variant.inStock ? "" : " — sin stock"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className={styles.variantText}>{[line.size, line.color].filter(Boolean).join(" / ")}</span>
              )}
              <span>{formatPrice(currentPrice)}</span>
              {currentPrice !== line.unitPrice && !unavailable && (
                <span className={styles.notice}>El precio cambió desde que lo agregaste.</span>
              )}
              {unavailable && <span className={styles.warning}>Ya no está disponible. Quitalo o elegí otra variante.</span>}
            </div>
            <div className={styles.controls}>
              <div className={styles.quantity}>
                <button type="button" onClick={() => decrement(line.variantId)} aria-label={`Restar una unidad de ${line.productName}`}>
                  −
                </button>
                <span aria-live="polite">{line.quantity}</span>
                <button type="button" onClick={() => increment(line.variantId)} aria-label={`Sumar una unidad de ${line.productName}`}>
                  +
                </button>
              </div>
              <button type="button" className={styles.remove} onClick={() => remove(line.variantId)}>
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <p className={styles.note}>El costo de entrega se calcula en el checkout.</p>
        {hasUnavailable ? (
          <p className={styles.warning}>Hay productos sin disponibilidad en tu carrito.</p>
        ) : (
          <Link href="/checkout" className={styles.checkout}>
            Iniciar compra
          </Link>
        )}
      </div>
    </>
  );
}

