import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/familia/session";
import { getCamino, getEarlyAccessProductIds } from "@/services/familia";
import { getProductSummariesByIds } from "@/services/catalog";
import { getEvents, getUniverseEntries, UNIVERSE_KIND_LABELS } from "@/services/universe";
import { EARLY_ACCESS_LABEL } from "@/lib/familia/membersOnly";
import { formatDateTimeAR } from "@/lib/datetime";
import { ProductCard } from "@/components/storefront/ProductCard";
import { EntryCard } from "@/components/storefront/content/EntryCard";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Members Only — Familia GxK",
};

// Members Only (Bible §24): prelaunches, early access, beneficios,
// invitaciones y contenido exclusivo. Lo exclusivo lo filtra RLS: solo un
// miembro con sesión lo recibe.
export default async function MembersOnlyPage() {
  const { supabase, member } = await requireMember();
  const [earlyIds, exclusive, events, camino] = await Promise.all([
    getEarlyAccessProductIds(supabase),
    getUniverseEntries(supabase, { membersOnly: true }),
    getEvents(supabase),
    getCamino(createSupabaseAdminClient(), member.userId),
  ]);
  const earlyAccess = await getProductSummariesByIds(supabase, earlyIds);
  const invitations = events.upcoming.filter((event) => event.membersOnly);
  const benefits = camino.rewards.filter((reward) => reward.status === "available");

  return (
    <>
      <h1>MEMBERS ONLY</h1>

      <section aria-label="Early access">
        <h2>{EARLY_ACCESS_LABEL}</h2>
        {earlyAccess.length === 0 ? (
          <p className={styles.muted}>No hay prelaunches en early access ahora.</p>
        ) : (
          <div className={styles.grid}>
            {earlyAccess.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Beneficios">
        <h2>Beneficios</h2>
        {benefits.length === 0 ? (
          <p className={styles.muted}>Seguí tu Camino G &amp; K: en la estación 5 y en la 10 hay beneficios.</p>
        ) : (
          <ul className={styles.list}>
            {benefits.map((reward) => (
              <li key={reward.id} className={styles.card}>
                Estación {reward.station}
                {reward.percent !== null ? ` — ${reward.percent}% OFF` : ""}
                {!reward.usable && <span className={styles.muted}>Disponible cuando se habiliten los beneficios del Camino.</span>}
              </li>
            ))}
          </ul>
        )}
        <Link href="/familia/camino">Mi Camino 🐾</Link>
      </section>

      <section aria-label="Invitaciones">
        <h2>Invitaciones</h2>
        {invitations.length === 0 ? (
          <p className={styles.muted}>No hay invitaciones abiertas.</p>
        ) : (
          <ul className={styles.list}>
            {invitations.map((event) => (
              <li key={event.id}>
                <EntryCard
                  href={`/eventos/${event.slug}`}
                  kicker={`${event.kindLabel} · ${formatDateTimeAR(event.startsAt)}`}
                  title={event.title}
                  summary={event.place}
                  coverUrl={event.coverUrl}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Contenido exclusivo">
        <h2>Contenido exclusivo</h2>
        {exclusive.length === 0 ? (
          <p className={styles.muted}>Todavía no hay contenido exclusivo.</p>
        ) : (
          <ul className={styles.list}>
            {exclusive.map((entry) => (
              <li key={entry.id}>
                <EntryCard
                  href={`/universo/${entry.slug}`}
                  kicker={UNIVERSE_KIND_LABELS[entry.kind] ?? entry.kind}
                  title={entry.title}
                  summary={entry.summary}
                  coverUrl={entry.coverUrl}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
