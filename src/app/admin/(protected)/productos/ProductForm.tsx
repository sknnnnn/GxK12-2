"use client";

import { useActionState } from "react";
import { PRODUCT_STATUSES, type AdminCategoryOption, type AdminProductDetail } from "@/services/admin";
import type { ProductFormState } from "./actions";
import { isoToLocalInput } from "@/lib/datetime";
import styles from "./ProductForm.module.css";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  discontinued: "Descontinuado",
};

type InitialProduct = Pick<
  AdminProductDetail,
  | "name"
  | "slug"
  | "productType"
  | "description"
  | "membersOnlyUntil"
  | "composition"
  | "price"
  | "categoryId"
  | "status"
  | "isFeatured"
  | "weightGrams"
  | "lengthCm"
  | "widthCm"
  | "heightCm"
>;

/**
 * Form de campos "core" del producto -- reutilizado por crear y editar
 * (solo cambia qué Server Action recibe, ya bindeada al productId cuando
 * corresponde). Imágenes y variantes se manejan aparte, dentro del editor
 * (ver ProductImagesManager / ProductVariantsManager) porque necesitan un
 * product_id existente.
 */
export function ProductForm({
  action,
  categories,
  initialProduct,
}: {
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: AdminCategoryOption[];
  initialProduct?: InitialProduct;
}) {
  const [state, formAction, isPending] = useActionState<ProductFormState, FormData>(action, null);

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && <p className={styles.error}>{state.error}</p>}

      <label className={styles.field}>
        Nombre
        <input type="text" name="name" required defaultValue={initialProduct?.name} />
      </label>

      <label className={styles.field}>
        Slug {!initialProduct && "(dejalo vacío para generarlo del nombre)"}
        <input type="text" name="slug" defaultValue={initialProduct?.slug} placeholder="se-genera-solo" />
      </label>

      <label className={styles.field}>
        Tipo (ej. remera oversize; también ayuda a encontrarlo en la búsqueda)
        <input type="text" name="productType" defaultValue={initialProduct?.productType ?? ""} />
      </label>

      <label className={styles.field}>
        Descripción
        <textarea name="description" rows={4} defaultValue={initialProduct?.description ?? ""} />
      </label>

      <label className={styles.field}>
        Composición
        <input type="text" name="composition" defaultValue={initialProduct?.composition ?? ""} placeholder="Ej. 100% algodón" />
      </label>

      <label className={styles.field}>
        MEMBERS ONLY — 24H EARLY ACCESS hasta (opcional)
        <input type="datetime-local" name="membersOnlyUntil" defaultValue={isoToLocalInput(initialProduct?.membersOnlyUntil ?? null)} />
        <span>Hasta esa fecha solo lo ven y compran miembros de FAMILIA GxK; después pasa solo a público. Hora de Argentina.</span>
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          Precio
          <input type="number" name="price" min="0" step="0.01" required defaultValue={initialProduct?.price} />
        </label>

        <label className={styles.field}>
          Categoría
          <select name="categoryId" required defaultValue={initialProduct?.categoryId ?? ""}>
            <option value="" disabled>
              Elegir...
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Estado
          <select name="status" defaultValue={initialProduct?.status ?? "draft"}>
            {PRODUCT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.checkboxField}>
        <input type="checkbox" name="isFeatured" defaultChecked={initialProduct?.isFeatured ?? false} />
        Destacado
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Datos para envío</legend>
        <div className={styles.row}>
          <label className={styles.field}>
            Peso (g)
            <input
              type="number"
              name="weightGrams"
              min="0"
              step="1"
              defaultValue={initialProduct?.weightGrams ?? ""}
              placeholder="Sin cargar"
            />
          </label>

          <label className={styles.field}>
            Largo (cm)
            <input
              type="number"
              name="lengthCm"
              min="0"
              step="0.1"
              defaultValue={initialProduct?.lengthCm ?? ""}
              placeholder="Sin cargar"
            />
          </label>

          <label className={styles.field}>
            Ancho (cm)
            <input
              type="number"
              name="widthCm"
              min="0"
              step="0.1"
              defaultValue={initialProduct?.widthCm ?? ""}
              placeholder="Sin cargar"
            />
          </label>

          <label className={styles.field}>
            Alto (cm)
            <input
              type="number"
              name="heightCm"
              min="0"
              step="0.1"
              defaultValue={initialProduct?.heightCm ?? ""}
              placeholder="Sin cargar"
            />
          </label>
        </div>
      </fieldset>

      <button type="submit" className={styles.submitButton} disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
