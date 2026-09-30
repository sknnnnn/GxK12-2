import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdventureChapter } from "@/services/universe";
import { RichText } from "@/components/storefront/content/RichText";
import { VideoEmbed } from "@/components/storefront/content/VideoEmbed";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Las Aventuras de G & K — GXK" };

export default async function ChapterPage({ params }: PageProps<"/universo/aventuras/[season]/[chapter]">) {
  const { season: seasonSlug, chapter: chapterSlug } = await params;
  const data = await getAdventureChapter(await createSupabaseServerClient(), seasonSlug, chapterSlug);
  if (!data) notFound();
  const { season, chapter, adventures, previous, next } = data;

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <Link href="/universo/aventuras">
        ← Season {String(season.number).padStart(2, "0")} — {season.title}
      </Link>
      <h1>
        {chapter.label}
        {chapter.title ? ` ${chapter.title}` : ""}
      </h1>
      {chapter.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
        <img src={chapter.coverUrl} alt="" className={styles.cover} />
      )}
      {chapter.summary && <p>{chapter.summary}</p>}
      {adventures.length === 0 ? (
        <p className={styles.muted}>Todavía no hay aventuras publicadas en este capítulo.</p>
      ) : (
        adventures.map((adventure) => (
          <article key={adventure.id} className={styles.section}>
            <h2>{adventure.title}</h2>
            {adventure.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
              <img src={adventure.coverUrl} alt="" className={styles.cover} />
            )}
            <RichText text={adventure.body} />
            <VideoEmbed url={adventure.videoUrl} title={adventure.title} />
          </article>
        ))
      )}
      <nav className={styles.pager} aria-label="Capítulos">
        {previous ? <Link href={`/universo/aventuras/${season.slug}/${previous.slug}`}>← {previous.label}</Link> : <span />}
        {next ? <Link href={`/universo/aventuras/${season.slug}/${next.slug}`}>{next.label} →</Link> : <span />}
      </nav>
    </main>
  );
}
