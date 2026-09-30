import type { ReactNode } from "react";
import { getMenuLink } from "@/lib/storefront/navigation";
import type { HomeEntrySectionConfig } from "@/lib/storefront/content";
import { SiteLinkItem } from "../SiteLinkItem";
import styles from "./sections.module.css";

// Sección de Home de entrada a otro sistema (Universo, G & K, Members Only):
// título, el texto que GXK cargó en Admin (si hay), contenido real opcional y
// sus accesos (lib/storefront/navigation).
export function HomeEntrySection({
  config,
  description,
  children,
}: {
  config: HomeEntrySectionConfig;
  description: string | null;
  children?: ReactNode;
}) {
  const titleId = `home-${config.id}-title`;
  return (
    <section id={config.id} className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId}>{config.title}</h2>
      {description && <p className={styles.entryDescription}>{description}</p>}
      {children}
      <div className={styles.entries}>
        {config.entryKeys.map((key) => (
          <SiteLinkItem key={key} link={getMenuLink(key)} />
        ))}
      </div>
    </section>
  );
}
