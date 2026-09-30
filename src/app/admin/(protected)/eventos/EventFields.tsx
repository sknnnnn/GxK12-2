import { CONTENT_STATUS_LABELS, CONTENT_STATUSES, EVENT_KIND_LABELS, EVENT_KINDS, type AdminEvent } from "@/services/admin";
import { isoToLocalInput } from "@/lib/datetime";
import styles from "@/components/admin/admin.module.css";

// Bible §29: fecha, lugar, horario, descripción, participación.
export function EventFields({ event }: { event?: AdminEvent }) {
  return (
    <>
      <div className={styles.row}>
        <label className={styles.field}>
          Tipo
          <select name="kind" defaultValue={event?.kind ?? "event"}>
            {EVENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EVENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Título
          <input name="title" defaultValue={event?.title} required />
        </label>
        <label className={styles.field}>
          Slug {!event && "(vacío = se genera)"}
          <input name="slug" defaultValue={event?.slug} />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          Inicio
          <input type="datetime-local" name="startsAt" defaultValue={isoToLocalInput(event?.startsAt ?? null)} required />
        </label>
        <label className={styles.field}>
          Fin (opcional)
          <input type="datetime-local" name="endsAt" defaultValue={isoToLocalInput(event?.endsAt ?? null)} />
        </label>
        <label className={styles.field}>
          Lugar
          <input name="place" defaultValue={event?.place ?? ""} />
        </label>
        <label className={styles.field}>
          Horario (como querés comunicarlo)
          <input name="schedule" defaultValue={event?.schedule ?? ""} />
        </label>
      </div>
      <label className={styles.field}>
        Descripción
        <textarea name="description" rows={4} defaultValue={event?.description ?? ""} />
      </label>
      <label className={styles.field}>
        Participación (cómo participar, inscripción, invitación…)
        <textarea name="participation" rows={3} defaultValue={event?.participation ?? ""} />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          Estado
          <select name="status" defaultValue={event?.status ?? "draft"}>
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CONTENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="membersOnly" defaultChecked={event?.membersOnly ?? false} /> Members Only (invitación para
          Familia GxK)
        </label>
      </div>
    </>
  );
}
