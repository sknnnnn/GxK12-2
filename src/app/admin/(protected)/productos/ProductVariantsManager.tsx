import type { AdminColorOption, AdminProductVariant, AdminSizeOption } from "@/services/admin";
import { createVariantAction, updateVariantAction } from "./actions";
import styles from "./ProductVariantsManager.module.css";
import { SubmitButton } from "@/components/admin/SubmitButton";

// Server Component: cada variante existente es su propia <form> (guarda
// talle/color/sku/precio/stock/activa juntos, un solo botón "Guardar" por
// fila) contra updateVariantAction; abajo hay un form aparte para crear una
// nueva. Ninguno asume que el producto tiene talle y color -- ambos
// selects admiten "Sin talle"/"Sin color" (ver services/admin.VariantInput).
export function ProductVariantsManager({
  productId,
  variants,
  sizes,
  colors,
}: {
  productId: string;
  variants: AdminProductVariant[];
  sizes: AdminSizeOption[];
  colors: AdminColorOption[];
}) {
  return (
    <section className={styles.section}>
      <h2>Variantes</h2>

      {variants.length === 0 ? (
        <p className={styles.emptyState}>Todavía no hay variantes.</p>
      ) : (
        <div className={styles.grid}>
          <div className={styles.headerRow}>
            <span>Talle</span>
            <span>Color</span>
            <span>SKU</span>
            <span>Precio (opcional)</span>
            <span>Stock</span>
            <span>Activa</span>
            <span></span>
          </div>

          {variants.map((variant) => (
            <form key={variant.id} action={updateVariantAction.bind(null, productId, variant.id)} className={styles.row}>
              <select name="sizeId" defaultValue={variant.size?.id ?? ""}>
                <option value="">Sin talle</option>
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>

              <select name="colorId" defaultValue={variant.color?.id ?? ""}>
                <option value="">Sin color</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>

              <input type="text" name="sku" defaultValue={variant.sku ?? ""} />

              <input type="number" name="priceOverride" min="0" step="0.01" defaultValue={variant.priceOverride ?? ""} />

              <input type="number" name="stock" min="0" step="1" required defaultValue={variant.stock} />

              <span className={styles.checkboxCell}>
                <input type="checkbox" name="isActive" defaultChecked={variant.isActive} />
              </span>

              <SubmitButton className={styles.saveButton}>Guardar</SubmitButton>
            </form>
          ))}
        </div>
      )}

      <form action={createVariantAction.bind(null, productId)} className={styles.newVariantForm}>
        <label className={styles.field}>
          Talle
          <select name="sizeId" defaultValue="">
            <option value="">Sin talle</option>
            {sizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Color
          <select name="colorId" defaultValue="">
            <option value="">Sin color</option>
            {colors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          SKU
          <input type="text" name="sku" />
        </label>

        <label className={styles.field}>
          Precio (opcional)
          <input type="number" name="priceOverride" min="0" step="0.01" />
        </label>

        <label className={styles.field}>
          Stock
          <input type="number" name="stock" min="0" step="1" required defaultValue={0} />
        </label>

        <SubmitButton className={styles.addButton} pendingText="Agregando…">
          Agregar variante
        </SubmitButton>
      </form>
    </section>
  );
}
