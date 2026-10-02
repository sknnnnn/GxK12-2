import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEventBySlug, getEventRelations } from "@/services/universe";
import { RelatedLinks, RelatedShop } from "@/components/storefront/content/Related";
import { formatDateAR, formatTimeAR } from "@/lib/datetime";
import { RichText } from "@/components/storefront/content/RichText";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Eventos — GXK" };

// Bible §29: fecha, lugar, horario, descripción, participación. GXK informa
// cómo participar: no hay RSVP, tickets ni registro de participantes.
export default async function EventoPage({ params }: PageProps<"/eventos/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const event = await getEventBySlug(supabase, slug);
  if (!event) notFound();
  const related = await getEventRelations(supabase, event.id);

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <Link href="/eventos">← Eventos</Link>
      <p className={styles.kicker}>
        {event.kindLabel}
        {event.membersOnly ? " · Members Only" : ""}
      </p>
      <h1>{event.title}</h1>
      {event.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
        <img src={event.coverUrl} alt="" className={styles.cover} />
      )}
      <dl className={styles.details}>
        <dt>Fecha</dt>
        <dd>
          {formatDateAR(event.startsAt)}
          {event.endsAt && formatDateAR(event.endsAt) !== formatDateAR(event.startsAt) ? ` al ${formatDateAR(event.endsAt)}` : ""}
        </dd>
        <dt>Horario</dt>
        <dd>{event.schedule ?? `${formatTimeAR(event.startsAt)}${event.endsAt ? ` a ${formatTimeAR(event.endsAt)}` : ""}`}</dd>
        {event.place && (
          <>
            <dt>Lugar</dt>
            <dd>{event.place}</dd>
          </>
        )}
      </dl>
      <RichText text={event.description} />
      {event.participation && (
        <section className={styles.section}>
          <h2>Participación</h2>
          <RichText text={event.participation} />
        </section>
      )}
      {event.extraInfo && (
        <section className={styles.section}>
          <h2>Información adicional</h2>
          <RichText text={event.extraInfo} />
        </section>
      )}
      <RelatedShop supabase={supabase} productIds={related.productIds} outfitIds={related.outfitIds} />
      <RelatedLinks related={related} />
    </main>
  );
}
