import Link from "next/link";
import styles from "./content.module.css";

/** Card de contenido (Universo / eventos): portada, rótulo, título, bajada. */
export function EntryCard({
  href,
  kicker,
  title,
  summary,
  coverUrl,
}: {
  href: string;
  kicker: string;
  title: string;
  summary?: string | null;
  coverUrl: string | null;
}) {
  return (
    <Link href={href} className={styles.card}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard.
        <img src={coverUrl} alt="" className={styles.cardImage} />
      ) : (
        <div className={styles.cardImagePlaceholder} aria-hidden="true" />
      )}
      <div className={styles.cardBody}>
        <span className={styles.kicker}>{kicker}</span>
        <strong>{title}</strong>
        {summary && <span className={styles.muted}>{summary}</span>}
      </div>
    </Link>
  );
}
