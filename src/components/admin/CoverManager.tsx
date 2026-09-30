import { SubmitButton } from "./SubmitButton";
import styles from "./admin.module.css";
import { removeCoverAction, uploadCoverAction } from "@/app/admin/(protected)/universo/coverActions";

type CoverTable = "universe_entries" | "adventure_seasons" | "adventure_chapters" | "adventures" | "events";

/** Portada de un contenido: ver, subir/reemplazar, quitar. */
export function CoverManager({
  table,
  id,
  coverPath,
  coverUrl,
  returnTo,
}: {
  table: CoverTable;
  id: string;
  coverPath: string | null;
  coverUrl: string | null;
  returnTo: string;
}) {
  return (
    <div className={styles.form}>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que Productos.
        <img src={coverUrl} alt="" style={{ maxWidth: 240 }} />
      )}
      <form action={uploadCoverAction.bind(null, table, id, coverPath, returnTo)} className={styles.row}>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required aria-label="Imagen de portada" />
        <SubmitButton className={styles.buttonSecondary} pendingText="Subiendo…">
          {coverUrl ? "Reemplazar portada" : "Subir portada"}
        </SubmitButton>
      </form>
      {coverPath && (
        <form action={removeCoverAction.bind(null, table, id, coverPath, returnTo)}>
          <SubmitButton className={styles.danger} confirmText="¿Quitar la portada?">
            Quitar portada
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
