"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { track } from "@/lib/analytics/track";
import { formatPrice } from "@/lib/format";
import { evaluateOutfit, pieceKey, resolvePiece } from "@/lib/outfits/selection";
import type { CatalogVariant } from "@/services/catalog";
import type { OutfitProduct, PublicOutfit } from "@/services/outfits";
import { VariantSelector } from "@/components/storefront/VariantSelector";
import styles from "./sections.module.css";

// Cada pieza enlaza a su producto ("ver cada pieza", Bible §12) y permite
// elegir talle/color con el selector real. Si el outfit fija una variante,
// se muestra esa y no hay nada que elegir.
function OutfitPiece({
  piece,
  onSelect,
}: {
  piece: OutfitProduct;
  onSelect: (key: string, variant: CatalogVariant | null) => void;
}) {
  const key = pieceKey(piece);
  const handleSelect = useCallback((variant: CatalogVariant | null) => onSelect(key, variant), [onSelect, key]);
  const { product } = piece;
  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const fixed = piece.variantId ? product.variants.find((v) => v.id === piece.variantId) : undefined;
  const status = resolvePiece(piece, null).status;

  // Una pieza agotada sigue visible (desaturada); el outfit no desaparece.
  return (
    <li className={status === "unavailable" ? `${styles.piece} ${styles.pieceSoldOut}` : styles.piece}>
      <Link href={`/producto/${product.slug}`} className={styles.pieceLink}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard: sin next/image todavía.
          <img src={image.url} alt={image.altText ?? product.name} className={styles.pieceImage} />
        ) : (
          <div className={styles.pieceImage} aria-hidden="true" />
        )}
        <span className={styles.pieceName}>{product.name}</span>
        <span>{formatPrice(fixed?.priceOverride ?? product.price)}</span>
      </Link>
      {piece.variantId ? (
        <p className={styles.pieceStatus}>
          {fixed ? [fixed.size?.name, fixed.color?.name].filter(Boolean).join(" · ") : ""}
          {status === "unavailable" ? (fixed ? " — Sin stock" : "No disponible") : ""}
        </p>
      ) : product.variants.some((v) => v.inStock) ? (
        <VariantSelector variants={product.variants} onSelectVariant={handleSelect} />
      ) : (
        <p className={styles.pieceStatus}>Sin stock</p>
      )}
    </li>
  );
}

export function OutfitCard({ outfit }: { outfit: PublicOutfit }) {
  const { addItem } = useCart();
  const [selections, setSelections] = useState<Record<string, CatalogVariant | null>>({});
  const [justAdded, setJustAdded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // Outfits visitados (Bible §36): una vista cuando el outfit entra en pantalla.
  useEffect(() => {
    const element = articleRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track("outfit_view", { outfitId: outfit.id });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [outfit.id]);

  const handleSelect = useCallback((key: string, variant: CatalogVariant | null) => {
    setSelections((prev) => (prev[key] === variant ? prev : { ...prev, [key]: variant }));
  }, []);

  const result = useMemo(() => evaluateOutfit(outfit.products, selections), [outfit.products, selections]);

  // Completo o parcial (Bible §12): las piezas agotadas o sin elegir quedan
  // como lugares vacíos y se agrega el resto.
  function handleAdd() {
    if (!result.complete && !result.partial) return;
    for (const line of result.lines) {
      addItem({ ...line, outfitId: outfit.id });
      track("add_to_cart", { productId: line.productId, outfitId: outfit.id, quantity: 1 });
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  let hint: string | null = null;
  if (result.unavailable > 0) hint = "Hay piezas sin stock: podés agregar las demás.";
  else if (result.needsSelection > 0) hint = "Elegí talle y color de cada pieza para agregar el outfit completo, o agregá solo las que ya elegiste.";
  const addLabel = result.complete ? "Agregar outfit completo" : result.partial ? `Agregar ${result.lines.length} de ${outfit.products.length} piezas` : "Agregar outfit completo";

  return (
    <article className={styles.outfit} ref={articleRef} id={`outfit-${outfit.slug}`}>
      {outfit.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard: sin next/image todavía.
        <img src={outfit.coverImageUrl} alt={outfit.name} className={styles.outfitCover} />
      ) : (
        <div className={styles.outfitCoverPlaceholder} aria-hidden="true" />
      )}
      <div className={styles.outfitInfo}>
        <h3 className={styles.outfitName}>{outfit.name}</h3>
        {outfit.description && <p className={styles.outfitDescription}>{outfit.description}</p>}
        <ul className={styles.pieces}>
          {outfit.products.map((piece) => (
            <OutfitPiece key={pieceKey(piece)} piece={piece} onSelect={handleSelect} />
          ))}
        </ul>
        <button type="button" className={styles.addAll} disabled={!result.complete && !result.partial} onClick={handleAdd}>
          {justAdded ? "Agregado al carrito ✓" : addLabel}
        </button>
        {hint && <p className={styles.pieceStatus}>{hint}</p>}
        {outfit.stories.length > 0 && (
          <p className={styles.pieceStatus}>
            Aparece en:{" "}
            {outfit.stories.map((story, index) => (
              <span key={story.href}>
                {index > 0 && " · "}
                <Link href={story.href}>
                  {story.label} · {story.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
