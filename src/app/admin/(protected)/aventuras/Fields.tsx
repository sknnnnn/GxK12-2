import { CONTENT_STATUS_LABELS, CONTENT_STATUSES, SEASON_STATUSES } from "@/services/admin";
import styles from "@/components/admin/admin.module.css";

export function StatusSelect({ value, seasons = false }: { value?: string; seasons?: boolean }) {
  const statuses = seasons ? SEASON_STATUSES : CONTENT_STATUSES;
  return (
    <label className={styles.field}>
      Estado
      <select name="status" defaultValue={value ?? "draft"}>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {CONTENT_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}
