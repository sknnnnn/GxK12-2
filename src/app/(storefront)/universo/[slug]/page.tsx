import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEntryRelations, getUniverseEntryBySlug } from "@/services/universe";
import { TrackEvent } from "@/components/storefront/analytics/Track";
import { formatDateAR } from "@/lib/datetime";
import { RichText } from "@/components/storefront/content/RichText";
import { VideoEmbed } from "@/components/storefront/content/VideoEmbed";
import { RelatedLinks, RelatedShop } from "@/components/storefront/content/Related";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Universo — GXK" };

// Campaña / producción / temporada / colaboración / audiovisual (Bible §27:
// historia, foto, video, producto). Si hay stock, se compra desde acá; si un
// producto se agota, la historia sigue (Bible §26).
export default async function UniverseEntryPage({ params }: PageProps<"/universo/[slug]">) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const entry = await getUniverseEntryBySlug(supabase, slug);
  if (!entry) notFound();

  const related = await getEntryRelations(supabase, entry.id);

  return (
    <main className={styles.page}>
      <TrackEvent event="entry_view" data={{ entryId: entry.id }} />
      <Link href="/universo">← Universo</Link>
      <p className={styles.kicker}>
        {entry.kindLabel} · {formatDateAR(entry.publishedAt)}
        {entry.membersOnly ? " · Members Only" : ""}
      </p>
      <h1>{entry.title}</h1>
      {entry.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
        <img src={entry.coverUrl} alt="" className={styles.cover} />
      )}
      {entry.summary && <p>{entry.summary}</p>}
      <RichText text={entry.body} />
      <VideoEmbed url={entry.videoUrl} title={entry.title} />
      {entry.media.length > 0 && (
        <div className={styles.gallery}>
          {entry.media.map((media) => (
            // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
            <img key={media.id} src={media.url} alt={media.altText ?? ""} />
          ))}
        </div>
      )}

      <RelatedShop supabase={supabase} productIds={entry.productIds} outfitIds={entry.outfitIds} />
      <RelatedLinks related={related} />
    </main>
  );
}
