import styles from "./sections.module.css";

// Próximo evento (Bible §15, punto 6; §29). Solo si existe: sin evento no
// renderiza nada (comportamiento definido por la Bible, no un placeholder).
//
// DEPENDENCIA REAL (Bloque 5): no existe modelo de eventos (tabla, servicio
// ni admin), así que la página pasa `null`. Este tipo es solo el contrato de
// presentación con los campos de la Bible §29 y se reemplaza por el tipo de
// services/events cuando exista. No se inventa ningún evento.
export type UpcomingEvent = {
  id: string;
  name: string;
  date: string;
  time: string | null;
  place: string | null;
  description: string | null;
  participation: string | null;
};

export function EventSection({ event }: { event: UpcomingEvent | null }) {
  if (!event) return null;

  return (
    <section id="evento" className={styles.section} aria-labelledby="home-evento">
      <h2 id="home-evento">Próximo evento</h2>
      <h3>{event.name}</h3>
      <p>
        {event.date}
        {event.time ? ` · ${event.time}` : ""}
        {event.place ? ` · ${event.place}` : ""}
      </p>
      {event.description && <p>{event.description}</p>}
      {event.participation && <p>{event.participation}</p>}
    </section>
  );
}
