import Link from "next/link";
import styles from "./familia.module.css";

// MI CASA (Bible §23): Mis pedidos · Seguimiento · Favoritos · Mis datos ·
// Direcciones · Members Only · Mi Camino 🐾. Más las notificaciones (Roadmap
// Bloque 6).
export const CASA_LINKS = [
  { href: "/familia/pedidos", label: "Mis pedidos" },
  { href: "/seguimiento", label: "Seguimiento" },
  { href: "/favoritos", label: "Favoritos" },
  { href: "/familia/datos", label: "Mis datos" },
  { href: "/familia/direcciones", label: "Direcciones" },
  { href: "/familia/members-only", label: "Members Only" },
  { href: "/familia/camino", label: "Mi Camino 🐾" },
  { href: "/familia/notificaciones", label: "Notificaciones" },
] as const;

export function CasaNav({ unread }: { unread: number }) {
  return (
    <nav aria-label="MI CASA">
      <ul className={styles.nav}>
        {CASA_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>
              {link.label}
              {link.href === "/familia/notificaciones" && unread > 0 ? ` (${unread})` : ""}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
