import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminEvent } from "@/services/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { CoverManager } from "@/components/admin/CoverManager";
import styles from "@/components/admin/admin.module.css";
import { deleteEventAction, saveEventAction } from "../actions";
import { EventFields } from "../EventFields";

export default async function AdminEventoPage(props: PageProps<"/admin/eventos/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const event = await getAdminEvent(await createSupabaseServerClient(), id);
  if (!event) notFound();

  return (
    <div className={styles.page}>
      <Link href="/admin/eventos">← Eventos</Link>
      <h1>{event.title}</h1>
      <Flash searchParams={searchParams} />
      <form action={saveEventAction.bind(null, event.id)} className={`${styles.card} ${styles.form}`}>
        <EventFields event={event} />
        <SubmitButton className={styles.button}>Guardar</SubmitButton>
      </form>
      <section className={styles.card}>
        <h2>Imagen</h2>
        <CoverManager table="events" id={event.id} coverPath={event.coverPath} coverUrl={event.coverUrl} returnTo={`/admin/eventos/${event.id}`} />
      </section>
      <form action={deleteEventAction.bind(null, event.id, event.coverPath)}>
        <SubmitButton className={styles.danger} confirmText={`¿Borrar "${event.title}"?`}>
          Borrar evento
        </SubmitButton>
      </form>
    </div>
  );
}
