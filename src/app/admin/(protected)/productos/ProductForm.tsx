"use client";

import { useActionState } from "react";
import { PRODUCT_STATUSES, type AdminCategoryOption, type AdminProductDetail } from "@/services/admin";
import type { ProductFormState } from "./actions";
import styles from "./ProductForm.module.css";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  discontinued: "Descontinuado",
};

type InitialProduct = Pick<AdminProductDetail, "name" | "slug" | "description" | "price" | "categoryId" | "status" | "isFeatured">;

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
        Descripción
        <textarea name="description" rows={4} defaultValue={initialProduct?.description ?? ""} />
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

      <button type="submit" className={styles.submitButton} disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
