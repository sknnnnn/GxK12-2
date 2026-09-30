import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUS_LABELS, EVENT_KIND_LABELS, getAdminEvents } from "@/services/admin";
import { formatDateTimeAR, isPast } from "@/lib/datetime";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { saveEventAction } from "./actions";
import { EventFields } from "./EventFields";

// Eventos (Bible §29). Después de su fecha pasan solos al archivo.
export default async function AdminEventosPage(props: PageProps<"/admin/eventos">) {
  const searchParams = await props.searchParams;
  const events = await getAdminEvents(await createSupabaseServerClient());

  return (
    <div className={styles.page}>
      <Link href="/admin/universo">← Universo</Link>
      <h1>Eventos</h1>
      <Flash searchParams={searchParams} />
      {events.length === 0 ? (
        <p className={styles.muted}>Todavía no hay eventos.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Tipo</th>
                <th>Inicio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link href={`/admin/eventos/${event.id}`}>{event.title}</Link>
                  </td>
                  <td>{EVENT_KIND_LABELS[event.kind]}</td>
                  <td>{formatDateTimeAR(event.startsAt)}</td>
                  <td>{CONTENT_STATUS_LABELS[event.status]}</td>
                  <td>{isPast(event.endsAt ?? event.startsAt) ? "Archivo" : "Próximo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form action={saveEventAction.bind(null, null)} className={`${styles.card} ${styles.form}`}>
        <h2>Nuevo evento</h2>
        <EventFields />
        <SubmitButton className={styles.button}>Crear evento</SubmitButton>
      </form>
    </div>
  );
}
