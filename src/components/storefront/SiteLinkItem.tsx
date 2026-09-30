import Link from "next/link";
import type { SiteLink } from "@/lib/storefront/navigation";
import styles from "./SiteLinkItem.module.css";

/**
 * Link de navegación según lib/storefront/navigation. Con `href` es un link
 * real; sin `href` (ruta de un bloque posterior) es un elemento inerte: no
 * navega, no simula destino, y expone de qué depende en `data-depends-on`.
 */
export function SiteLinkItem({ link }: { link: SiteLink }) {
  if (link.href) return <Link href={link.href}>{link.label}</Link>;
  return (
    <span className={styles.inert} aria-disabled="true" data-depends-on={link.dependsOn}>
      {link.label}
    </span>
  );
}
