import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUniverseEntries, UNIVERSE_KIND_LABELS, UNIVERSE_KIND_SLUGS } from "@/services/universe";
import { getSiteContent } from "@/services/site";
import { formatDateAR } from "@/lib/datetime";
import { RichText } from "@/components/storefront/content/RichText";
import { EntryCard } from "@/components/storefront/content/EntryCard";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Universo — GXK" };

const KIND_BY_SLUG = Object.fromEntries(Object.entries(UNIVERSE_KIND_SLUGS).map(([kind, slug]) => [slug, kind]));

// UNIVERSO GXK 12:2 (Bible §26): archivo creativo. Una prenda puede
// agotarse; la historia permanece.
export default async function UniversoPage({ searchParams }: PageProps<"/universo">) {
  const { tipo } = await searchParams;
  const kind = typeof tipo === "string" ? KIND_BY_SLUG[tipo] : undefined;
  const supabase = await createSupabaseServerClient();
  const [entries, content] = await Promise.all([getUniverseEntries(supabase, { kind }), getSiteContent(supabase)]);

  return (
    <main className={styles.page}>
      <h1>UNIVERSO GXK 12:2</h1>
      <RichText text={content.universoDescription} />
      <nav className={styles.tabs} aria-label="Universo">
        <Link href="/universo" className={!kind ? styles.tabActive : styles.tab}>
          Todo
        </Link>
        {Object.entries(UNIVERSE_KIND_SLUGS).map(([entryKind, slug]) => (
          <Link key={slug} href={`/universo?tipo=${slug}`} className={kind === entryKind ? styles.tabActive : styles.tab}>
            {UNIVERSE_KIND_LABELS[entryKind]}
          </Link>
        ))}
        <Link href="/universo/aventuras" className={styles.tab}>
          Las Aventuras de G &amp; K
        </Link>
        <Link href="/eventos" className={styles.tab}>
          Eventos
        </Link>
      </nav>
      {entries.length === 0 ? (
        <p className={styles.muted}>Todavía no hay contenido publicado{kind ? " en esta sección" : ""}.</p>
      ) : (
        <div className={styles.grid}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              href={`/universo/${entry.slug}`}
              kicker={`${entry.kindLabel} · ${formatDateAR(entry.publishedAt)}${entry.membersOnly ? " · Members Only" : ""}`}
              title={entry.title}
              summary={entry.summary}
              coverUrl={entry.coverUrl}
            />
          ))}
        </div>
      )}
    </main>
  );
}
