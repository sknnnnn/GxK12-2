import { FOOTER_LINKS, MENU_LINKS } from "@/lib/storefront/navigation";
import { BRAND_NAME } from "@/lib/storefront/content";
import { buildWhatsAppHref, GENERAL_INQUIRY_MESSAGE } from "@/lib/storefront/whatsapp";
import type { SiteSettings } from "@/services/site";
import { SiteLinkItem } from "./SiteLinkItem";
import styles from "./SiteFooter.module.css";

// Footer del Storefront: estructura funcional. Redes (Bible §35: solo
// enlaces, sin feeds) y WhatsApp (Bible §22) salen de site_settings, que el
// admin edita; si no están cargados no se muestran -- no se inventan.
export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const external = [
    settings.instagramUrl ? { key: "instagram", label: "Instagram", href: settings.instagramUrl } : null,
    settings.tiktokUrl ? { key: "tiktok", label: "TikTok", href: settings.tiktokUrl } : null,
    settings.whatsappNumber
      ? { key: "whatsapp", label: "WhatsApp", href: buildWhatsAppHref(settings.whatsappNumber, GENERAL_INQUIRY_MESSAGE) }
      : null,
  ].filter((link): link is { key: string; label: string; href: string } => link !== null);

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
      {external.length > 0 && (
        <div className={styles.group}>
          {external.map((link) => (
            <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </footer>
  );
}
