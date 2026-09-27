"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminShell.module.css";

// Navegación preparada para crecer: las secciones sin gestión completa
// todavía son placeholders funcionales (ver src/app/admin/(protected)/*),
// pero ya quedan en el menú.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/configuracion", label: "Configuración" },
] as const;

// Solo resalta el link activo -- UI pura, sin lógica de negocio. Es el
// único pedazo del shell que necesita ser Client Component (usePathname).
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={isActive ? styles.navLinkActive : styles.navLink}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
