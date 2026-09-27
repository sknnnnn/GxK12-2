import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import type { AdminProductImage } from "@/services/admin";
import { deleteImageAction, setPrimaryImageAction, uploadImageAction } from "./actions";
import styles from "./ProductImagesManager.module.css";

/**
 * Server Component: cada acción es un <form> plano contra una Server
 * Action bindeada al productId/imageId (ver actions.ts) -- no hace falta
 * estado de cliente para nada de esto, salvo el confirm() de borrar
 * (ConfirmSubmitButton, el único pedazo que es Client Component).
 */
export function ProductImagesManager({ productId, images }: { productId: string; images: AdminProductImage[] }) {
  return (
    <section className={styles.section}>
      <h2>Imágenes</h2>

      {images.length === 0 ? (
        <p className={styles.emptyState}>Todavía no hay imágenes.</p>
      ) : (
        <ul className={styles.grid}>
          {images.map((image) => (
            <li key={image.id} className={styles.item}>
              {/* eslint-disable-next-line @next/next/no-img-element -- sin next/image, ver services/catalog. */}
              <img src={image.url} alt={image.altText ?? ""} className={styles.image} />
              {image.isPrimary ? (
                <span className={styles.primaryBadge}>Principal</span>
              ) : (
                <form action={setPrimaryImageAction.bind(null, productId, image.id)}>
                  <button type="submit" className={styles.smallButton}>
                    Marcar principal
                  </button>
                </form>
              )}
              <form action={deleteImageAction.bind(null, productId, image.id)}>
                <ConfirmSubmitButton
                  confirmText="¿Eliminar esta imagen? Esta acción no se puede deshacer."
                  className={styles.deleteButton}
                >
                  Eliminar
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={uploadImageAction.bind(null, productId)} encType="multipart/form-data" className={styles.uploadForm}>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
        <input type="text" name="altText" placeholder="Texto alternativo (opcional)" />
        <button type="submit" className={styles.uploadButton}>
          Subir imagen
        </button>
      </form>
    </section>
  );
}
