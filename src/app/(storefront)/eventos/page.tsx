import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEvents } from "@/services/universe";
import { formatDateTimeAR } from "@/lib/datetime";
import { EntryCard } from "@/components/storefront/content/EntryCard";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Eventos — GXK" };

// EVENTOS (Bible §29): showrooms, colaboraciones, eventos y experiencias.
// Después pasan a archivo.
export default async function EventosPage() {
  const { upcoming, archive } = await getEvents(await createSupabaseServerClient());

  return (
    <main className={styles.page}>
      <h1>EVENTOS</h1>
      <section className={styles.section} aria-labelledby="proximos">
        <h2 id="proximos">Próximos</h2>
        {upcoming.length === 0 ? (
          <p className={styles.muted}>No hay eventos próximos por ahora.</p>
        ) : (
          <div className={styles.grid}>
            {upcoming.map((event) => (
              <EntryCard
                key={event.id}
                href={`/eventos/${event.slug}`}
                kicker={`${event.kindLabel} · ${formatDateTimeAR(event.startsAt)}`}
                title={event.title}
                summary={event.place}
                coverUrl={event.coverUrl}
              />
            ))}
          </div>
        )}
      </section>
      {archive.length > 0 && (
        <section className={styles.section} aria-labelledby="archivo">
          <h2 id="archivo">Archivo</h2>
          <div className={styles.grid}>
            {archive.map((event) => (
              <EntryCard
                key={event.id}
                href={`/eventos/${event.slug}`}
                kicker={`${event.kindLabel} · ${formatDateTimeAR(event.startsAt)}`}
                title={event.title}
                summary={event.place}
                coverUrl={event.coverUrl}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
