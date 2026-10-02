import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminEvent, getLinkedIds, getRelationOptions } from "@/services/admin";
import { RelationEditor } from "@/components/admin/RelationEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { CoverManager } from "@/components/admin/CoverManager";
import styles from "@/components/admin/admin.module.css";
import { deleteEventAction, saveEventAction } from "../actions";
import { EventFields } from "../EventFields";

export default async function AdminEventoPage(props: PageProps<"/admin/eventos/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const [event, options, entryIds, chapterIds, productIds, outfitIds] = await Promise.all([
    getAdminEvent(supabase, id),
    getRelationOptions(supabase),
    getLinkedIds(supabase, "event_entry", id),
    getLinkedIds(supabase, "event_chapter", id),
    getLinkedIds(supabase, "event_product", id),
    getLinkedIds(supabase, "event_outfit", id),
  ]);
  if (!event) notFound();
  const returnTo = `/admin/eventos/${event.id}`;

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
        <CoverManager table="events" id={event.id} coverPath={event.coverPath} coverUrl={event.coverUrl} returnTo={returnTo} />
      </section>
      {/* Relaciones opcionales y directas (no pasan por Universe). Sin RSVP ni tickets. */}
      <RelationEditor title="Universo relacionado (campañas, temporadas, colaboraciones…)" relation="event_entry" ownerId={event.id} linkedIds={entryIds} options={options.entries} returnTo={returnTo} />
      <RelationEditor title="Las Aventuras de G & K" relation="event_chapter" ownerId={event.id} linkedIds={chapterIds} options={options.chapters} returnTo={returnTo} />
      <RelationEditor title="Productos" relation="event_product" ownerId={event.id} linkedIds={productIds} options={options.products} returnTo={returnTo} />
      <RelationEditor title="Outfits" relation="event_outfit" ownerId={event.id} linkedIds={outfitIds} options={options.outfits} returnTo={returnTo} />
      <form action={deleteEventAction.bind(null, event.id, event.coverPath)}>
        <SubmitButton className={styles.danger} confirmText={`¿Borrar "${event.title}"?`}>
          Borrar evento
        </SubmitButton>
      </form>
    </div>
  );
}
