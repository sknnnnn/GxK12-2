import { CONTACT, FOOTER_LINKS, MENU_LINKS, SOCIAL_LINKS } from "@/lib/storefront/navigation";
import { BRAND_NAME } from "@/lib/storefront/content";
import { SiteLinkItem } from "./SiteLinkItem";
import styles from "./SiteFooter.module.css";

// Footer del Storefront: estructura funcional. Solo muestra datos definidos:
// redes y contacto (WhatsApp) se renderizan únicamente si su URL existe en
// lib/storefront/navigation; hoy no están definidos y no se inventan. Textos
// legales: no definidos, sin bloque asignado.
export function SiteFooter() {
  const social = SOCIAL_LINKS.filter((link): link is typeof link & { href: string } => link.href !== null);

  return (
    <footer className={styles.footer}>
      <p className={styles.brand}>{BRAND_NAME}</p>
      <nav aria-label="Menú del pie" className={styles.group}>
        {MENU_LINKS.map((link) => (
          <SiteLinkItem key={link.key} link={link} />
        ))}
        {FOOTER_LINKS.map((link) => (
          <SiteLinkItem key={link.key} link={link} />
        ))}
      </nav>
      {(social.length > 0 || CONTACT.whatsappHref) && (
        <div className={styles.group}>
          {social.map((link) => (
            <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
          {CONTACT.whatsappHref && (
            <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          )}
        </div>
      )}
    </footer>
  );
}
