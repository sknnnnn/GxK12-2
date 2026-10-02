import Link from "next/link";
import type { RelationKey } from "@/services/admin";
import { linkRelationAction, unlinkRelationAction } from "@/app/admin/(protected)/universo/relationActions";
import { SubmitButton } from "./SubmitButton";
import styles from "./admin.module.css";

type Option = { id: string; name: string; href?: string };

// Relación N:N opcional (Admin Control, Fase A): lista lo relacionado en su
// orden y permite asociar/quitar. Mismo patrón que Productos/Outfits del
// Universo.
export function RelationEditor({
  title,
  relation,
  ownerId,
  linkedIds,
  options,
  returnTo,
}: {
  title: string;
  relation: RelationKey;
  ownerId: string;
  linkedIds: string[];
  options: Option[];
  returnTo: string;
}) {
  const byId = new Map(options.map((option) => [option.id, option]));
  const available = options.filter((option) => option.id !== ownerId && !linkedIds.includes(option.id));
  return (
    <section className={styles.card}>
      <h2>{title}</h2>
      <ul className={styles.list}>
        {linkedIds.map((id) => {
          const option = byId.get(id);
          return (
            <li key={id} className={styles.row}>
              {option?.href ? (
                <Link href={option.href} style={{ flex: 1 }}>
                  {option.name}
                </Link>
              ) : (
                <span style={{ flex: 1 }}>{option?.name ?? "—"}</span>
              )}
              <form action={unlinkRelationAction.bind(null, relation, ownerId, id, returnTo)}>
                <SubmitButton className={styles.danger}>Quitar</SubmitButton>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={linkRelationAction.bind(null, relation, ownerId, linkedIds.length, returnTo)} className={styles.row}>
        <select name="targetId" required defaultValue="" aria-label={title}>
          <option value="" disabled>
            Elegir…
          </option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <SubmitButton className={styles.buttonSecondary}>Asociar</SubmitButton>
      </form>
    </section>
  );
}
