import Link from "next/link";
import { BRAND_NAME, HERO_ENTRIES, SLOGAN } from "@/lib/storefront/content";
import styles from "./sections.module.css";

// Hero editorial (Bible §15, punto 1): imagen que carga GXK en Admin >
// Contenido (sin imagen no se muestra ninguna), marca + slogan (Bible §1) y
// las dos entradas de "Dos velocidades" (Bible §13).
export function HeroSection({ media }: { media: { imageUrl: string; alt: string } | null }) {
  return (
    <section className={styles.hero} aria-labelledby="home-hero">
      {media && (
        // eslint-disable-next-line @next/next/no-img-element -- mismo criterio que ProductCard: sin next/image todavía.
        <img src={media.imageUrl} alt={media.alt} className={styles.heroMedia} />
      )}
      <h1 id="home-hero">{BRAND_NAME}</h1>
      <p className={styles.heroSlogan}>{SLOGAN}</p>
      <div className={styles.heroEntries}>
        {HERO_ENTRIES.map((entry) => (
          <Link key={entry.key} href={entry.href} className={styles.heroEntry}>
            {entry.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
