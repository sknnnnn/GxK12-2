import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdventureSeasons } from "@/services/universe";
import { getSiteContent } from "@/services/site";
import { RichText } from "@/components/storefront/content/RichText";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Las Aventuras de G & K — GXK" };

// Las Aventuras de G & K (Bible §28): temporadas -> capítulos -> aventuras.
export default async function AventurasPage() {
  const supabase = await createSupabaseServerClient();
  const [seasons, content] = await Promise.all([getAdventureSeasons(supabase), getSiteContent(supabase)]);

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <Link href="/universo">← Universo</Link>
      <h1>Las Aventuras de G &amp; K</h1>
      <RichText text={content.gkDescription} />
      {seasons.length === 0 ? (
        <p className={styles.muted}>Todavía no hay temporadas publicadas.</p>
      ) : (
        seasons.map((season) => (
          <section key={season.id} className={styles.section} aria-labelledby={`season-${season.number}`}>
            <h2 id={`season-${season.number}`}>
              Season {String(season.number).padStart(2, "0")} — {season.comingSoon ? "coming soon" : season.title}
            </h2>
            {season.coverUrl && !season.comingSoon && (
              // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
              <img src={season.coverUrl} alt="" className={styles.cover} />
            )}
            {season.summary && !season.comingSoon && <p>{season.summary}</p>}
            {!season.comingSoon &&
              (season.chapters.length === 0 ? (
                <p className={styles.muted}>Todavía no hay capítulos publicados.</p>
              ) : (
                <ol className={styles.chapters}>
                  {season.chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <Link href={`/universo/aventuras/${season.slug}/${chapter.slug}`}>
                        <strong>{chapter.label}</strong>
                        <span>{chapter.title}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ))}
          </section>
        ))
      )}
    </main>
  );
}
