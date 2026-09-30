import { OUTFIT_STATUSES, OUTFIT_STYLE_LABELS, OUTFIT_STYLES, type AdminOutfitDetail } from "@/services/admin";
import { isoToLocalInput } from "@/lib/datetime";
import styles from "@/components/admin/admin.module.css";

export const STATUS_LABELS: Record<string, string> = { draft: "Borrador", published: "Publicado", hidden: "Oculto" };

export function OutfitFields({ outfit }: { outfit?: AdminOutfitDetail }) {
  return (
    <>
      <div className={styles.row}>
        <label className={styles.field}>
          Nombre
          <input name="name" defaultValue={outfit?.name} required />
        </label>
        <label className={styles.field}>
          Slug {!outfit && "(vacío = se genera)"}
          <input name="slug" defaultValue={outfit?.slug} />
        </label>
        <label className={styles.field}>
          Estilo (Bible §12)
          <select name="style" defaultValue={outfit?.style ?? ""}>
            <option value="">Sin estilo</option>
            {OUTFIT_STYLES.map((style) => (
              <option key={style} value={style}>
                {OUTFIT_STYLE_LABELS[style]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Estado
          <select name="status" defaultValue={outfit?.status ?? "draft"}>
            {OUTFIT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.field}>
        Descripción
        <textarea name="description" rows={3} defaultValue={outfit?.description ?? ""} />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          Desde (opcional)
          <input type="datetime-local" name="startsAt" defaultValue={isoToLocalInput(outfit?.startsAt ?? null)} />
        </label>
        <label className={styles.field}>
          Hasta (opcional)
          <input type="datetime-local" name="endsAt" defaultValue={isoToLocalInput(outfit?.endsAt ?? null)} />
        </label>
        <label className={styles.field} style={{ maxWidth: "6rem" }}>
          Orden
          <input type="number" name="sortOrder" defaultValue={outfit?.sortOrder ?? 0} />
        </label>
      </div>
    </>
  );
}
