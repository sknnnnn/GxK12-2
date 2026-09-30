import Link from "next/link";
import { ACCESS_LINKS, MENU_LINKS } from "@/lib/storefront/navigation";
import { CartLink } from "./CartLink";
import { SiteLinkItem } from "./SiteLinkItem";
import styles from "./SiteHeader.module.css";

// Header del Storefront: menú y accesos de la Bible §14. Estructura y
// comportamiento; la resolución visual (mobile/desktop) sale de Figma.
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        GXK
      </Link>
      <nav aria-label="Menú principal" className={styles.nav}>
        {MENU_LINKS.map((link) => (
          <SiteLinkItem key={link.key} link={link} />
        ))}
      </nav>
      <nav aria-label="Accesos" className={styles.nav}>
        {ACCESS_LINKS.map((link) => (
          <SiteLinkItem key={link.key} link={link} />
        ))}
        <CartLink />
      </nav>
    </header>
  );
}
