import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS_LABELS, getAdminUniverseEntries, UNIVERSE_KIND_LABELS } from "@/services/admin";
import { formatDateTimeAR } from "@/lib/datetime";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { createUniverseEntryAction } from "./actions";
import { EntryFields } from "./EntryFields";

// UNIVERSO GXK 12:2 (Bible §26): archivo creativo. Las Aventuras de G & K
// y los eventos tienen su propia pantalla.
export default async function AdminUniversoPage(props: PageProps<"/admin/universo">) {
  const searchParams = await props.searchParams;
  const entries = await getAdminUniverseEntries(await createSupabaseServerClient());

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Universo</h1>
        <span>
          <Link href="/admin/aventuras">Aventuras de G &amp; K</Link> · <Link href="/admin/eventos">Eventos</Link>
        </span>
      </div>
      <Flash searchParams={searchParams} />

      {entries.length === 0 ? (
        <p className={styles.muted}>Todavía no hay campañas, producciones, temporadas, colaboraciones ni audiovisual.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Publicación</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <Link href={`/admin/universo/${entry.id}`}>{entry.title}</Link>
                    {entry.membersOnly && <span className={styles.badge}> Members Only</span>}
                  </td>
                  <td>{UNIVERSE_KIND_LABELS[entry.kind]}</td>
                  <td>{CONTENT_STATUS_LABELS[entry.status]}</td>
                  <td>{formatDateTimeAR(entry.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={createUniverseEntryAction} className={`${styles.card} ${styles.form}`}>
        <h2>Nueva entrada</h2>
        <EntryFields />
        <SubmitButton className={styles.button}>Crear</SubmitButton>
      </form>
    </div>
  );
}
