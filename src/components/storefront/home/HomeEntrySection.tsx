import { getMenuLink } from "@/lib/storefront/navigation";
import type { HomeEntrySectionConfig } from "@/lib/storefront/content";
import { SiteLinkItem } from "../SiteLinkItem";
import styles from "./sections.module.css";

// Sección de Home que es solo "entrada" a un sistema de un bloque posterior
// (Universo, G & K, Members Only): muestra su título, la descripción si GXK
// ya la definió y sus entradas de navegación. Los links salen de
// lib/storefront/navigation: inertes hasta que exista la ruta real (no se
// crea ningún sistema paralelo). Sin descripción definida, no se inventa.
export function HomeEntrySection({ config }: { config: HomeEntrySectionConfig }) {
  const titleId = `home-${config.id}-title`;
  return (
    <section id={config.id} className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId}>{config.title}</h2>
      {config.description && <p className={styles.entryDescription}>{config.description}</p>}
      <div className={styles.entries}>
        {config.entryKeys.map((key) => (
          <SiteLinkItem key={key} link={getMenuLink(key)} />
        ))}
      </div>
    </section>
  );
}
