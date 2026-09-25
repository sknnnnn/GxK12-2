"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

// 100% client: el carrito vive en localStorage/Context, no hay datos de
// servidor que buscar acá (ver src/lib/cart/CartProvider.tsx). El precio
// mostrado es el que se guardó al agregar cada línea -- checkout es quien
// revalida precio/stock reales antes de cobrar, esta página no lo hace.
export default function CarritoPage() {
  const { lines, increment, decrement, remove, clear, subtotal } = useCart();

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Carrito</h1>
        <Link href="/catalogo">Seguir comprando</Link>
      </div>

      {lines.length === 0 ? (
        <div className={styles.empty}>
          <p>Tu carrito está vacío.</p>
          <Link href="/catalogo">Ver catálogo</Link>
        </div>
      ) : (
        <>
          <ul className={styles.lines}>
            {lines.map((line) => {
              const variantLabel = [line.size, line.color].filter(Boolean).join(" / ");
              return (
                <li key={line.variantId} className={styles.line}>
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- sin next/image todavía, ver services/catalog.
                    <img src={line.imageUrl} alt={line.productName} className={styles.image} />
                  ) : (
                    <div className={styles.imagePlaceholder} aria-hidden="true" />
                  )}

                  <div className={styles.lineInfo}>
                    <Link href={`/producto/${line.productSlug}`} className={styles.lineName}>
                      {line.productName}
                    </Link>
                    {variantLabel && <span className={styles.lineVariant}>{variantLabel}</span>}
                    <span>{formatPrice(line.unitPrice)} c/u</span>
                    <div className={styles.lineQuantity}>
                      <button
                        type="button"
                        className={styles.qtyButton}
                        onClick={() => decrement(line.variantId)}
                        aria-label={`Restar una unidad de ${line.productName}`}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        className={styles.qtyButton}
                        onClick={() => increment(line.variantId)}
                        aria-label={`Sumar una unidad de ${line.productName}`}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.lineTotals}>
                    <span className={styles.lineSubtotal}>{formatPrice(line.unitPrice * line.quantity)}</span>
                    <button type="button" className={styles.removeButton} onClick={() => remove(line.variantId)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.summary}>
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.clearButton} onClick={clear}>
              Vaciar carrito
            </button>
            {/* /checkout todavía no está implementado -- esta es la ruta
                preparada para la próxima etapa (ver services/checkout). */}
            <Link href="/checkout" className={styles.checkoutCta}>
              Ir a checkout
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
