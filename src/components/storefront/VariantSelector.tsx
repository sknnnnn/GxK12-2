"use client";

import { useMemo, useState } from "react";
import type { CatalogColor, CatalogSize, CatalogVariant } from "@/services/catalog";
import styles from "./VariantSelector.module.css";

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...byId.values()];
}

/**
 * Selección de talle/color a partir de las variantes reales del producto.
 * No inventa combinaciones: un talle o color solo queda habilitado si
 * existe al menos una variante real para la combinación actual, y la
 * disponibilidad de stock siempre se lee de CatalogVariant.inStock
 * (booleano ya resuelto server-side, nunca un número de stock).
 */
export function VariantSelector({ variants }: { variants: CatalogVariant[] }) {
  const sizes: CatalogSize[] = useMemo(
    () => dedupeById(variants.map((v) => v.size).filter((s): s is CatalogSize => s !== null)),
    [variants],
  );
  const colors: CatalogColor[] = useMemo(
    () => dedupeById(variants.map((v) => v.color).filter((c): c is CatalogColor => c !== null)),
    [variants],
  );

  const hasSizes = sizes.length > 0;
  const hasColors = colors.length > 0;

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  const isSizeAvailable = (sizeId: string) =>
    variants.some((v) => v.size?.id === sizeId && (!hasColors || !selectedColorId || v.color?.id === selectedColorId));

  const isColorAvailable = (colorId: string) =>
    variants.some((v) => v.color?.id === colorId && (!hasSizes || !selectedSizeId || v.size?.id === selectedSizeId));

  const selectedVariant = useMemo(() => {
    if (!hasSizes && !hasColors) return variants[0] ?? null;
    if (hasSizes && !selectedSizeId) return null;
    if (hasColors && !selectedColorId) return null;
    return (
      variants.find((v) => {
        const sizeMatches = hasSizes ? v.size?.id === selectedSizeId : true;
        const colorMatches = hasColors ? v.color?.id === selectedColorId : true;
        return sizeMatches && colorMatches;
      }) ?? null
    );
  }, [variants, hasSizes, hasColors, selectedSizeId, selectedColorId]);

  let statusText: string;
  if (variants.length === 0) {
    statusText = "Sin variantes disponibles";
  } else if (!selectedVariant) {
    statusText = "Elegí una combinación";
  } else if (selectedVariant.inStock) {
    statusText = "Disponible";
  } else {
    statusText = "Sin stock";
  }

  return (
    <div className={styles.wrapper}>
      {hasSizes && (
        <fieldset className={styles.group}>
          <legend>Talle</legend>
          <div className={styles.options}>
            {sizes.map((size) => {
              const available = isSizeAvailable(size.id);
              const selected = selectedSizeId === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  className={available ? (selected ? `${styles.option} ${styles.optionSelected}` : styles.option) : styles.optionDisabled}
                  onClick={() => setSelectedSizeId(size.id)}
                >
                  {size.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasColors && (
        <fieldset className={styles.group}>
          <legend>Color</legend>
          <div className={styles.options}>
            {colors.map((color) => {
              const available = isColorAvailable(color.id);
              const selected = selectedColorId === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  className={available ? (selected ? `${styles.option} ${styles.optionSelected}` : styles.option) : styles.optionDisabled}
                  onClick={() => setSelectedColorId(color.id)}
                >
                  {color.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <p className={styles.status}>{statusText}</p>
    </div>
  );
}
