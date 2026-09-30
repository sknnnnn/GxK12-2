import Link from "next/link";
import { formatDateAR, formatTimeAR } from "@/lib/datetime";
import type { PublicEvent } from "@/services/universe";
import styles from "./sections.module.css";

// Próximo evento, solo si existe (Bible §15, punto 6; §29): sin evento
// próximo publicado no se renderiza nada.
export function EventSection({ event }: { event: PublicEvent | null }) {
  if (!event) return null;

  return (
    <section id="evento" className={styles.section} aria-labelledby="home-evento">
      <h2 id="home-evento">Próximo evento</h2>
      <h3>
        <Link href={`/eventos/${event.slug}`}>{event.title}</Link>
      </h3>
      <p>
        {event.kindLabel} · {formatDateAR(event.startsAt)} · {event.schedule ?? formatTimeAR(event.startsAt)}
        {event.place ? ` · ${event.place}` : ""}
      </p>
      {event.description && <p>{event.description.split(/\n\s*\n/)[0]}</p>}
      <Link href="/eventos">Ver eventos</Link>
    </section>
  );
}
