import { CONTENT_STATUS_LABELS, CONTENT_STATUSES, UNIVERSE_KIND_LABELS, UNIVERSE_KINDS, type AdminUniverseEntry } from "@/services/admin";
import { isoToLocalInput } from "@/lib/datetime";
import styles from "@/components/admin/admin.module.css";

export function EntryFields({ entry }: { entry?: AdminUniverseEntry }) {
  return (
    <>
      <div className={styles.row}>
        <label className={styles.field}>
          Tipo
          <select name="kind" defaultValue={entry?.kind ?? "campaign"}>
            {UNIVERSE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {UNIVERSE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Título
          <input name="title" defaultValue={entry?.title} required />
        </label>
        <label className={styles.field}>
          Slug {!entry && "(vacío = se genera)"}
          <input name="slug" defaultValue={entry?.slug} />
        </label>
      </div>
      <label className={styles.field}>
        Bajada
        <textarea name="summary" rows={2} defaultValue={entry?.summary ?? ""} />
      </label>
      <label className={styles.field}>
        Historia (texto; separá párrafos con una línea en blanco)
        <textarea name="body" rows={8} defaultValue={entry?.body ?? ""} />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          Video (enlace https://)
          <input name="videoUrl" defaultValue={entry?.videoUrl ?? ""} />
        </label>
        <label className={styles.field}>
          Fecha de publicación
          <input type="datetime-local" name="publishedAt" defaultValue={isoToLocalInput(entry?.publishedAt ?? null)} />
        </label>
        <label className={styles.field} style={{ maxWidth: "6rem" }}>
          Orden
          <input type="number" name="sortOrder" defaultValue={entry?.sortOrder ?? 0} />
        </label>
        <label className={styles.field}>
          Estado
          <select name="status" defaultValue={entry?.status ?? "draft"}>
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CONTENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="membersOnly" defaultChecked={entry?.membersOnly ?? false} /> Members Only (contenido exclusivo de
        Familia GxK)
      </label>
    </>
  );
}
