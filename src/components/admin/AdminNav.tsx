"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminShell.module.css";

type NavItem = { href: string; label: string; activePrefixes?: string[]; children?: NavItem[] };

// Secciones de Admin (Bible §34: operar sin developer), agrupadas según la
// arquitectura del Admin (navegación ≠ modelo de datos: Campaigns,
// Productions, Seasons y Collaborations son vistas filtradas de las
// entradas del Universo).
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operación",
    items: [
      { href: "/admin", label: "Dashboard" },
      {
        href: "/admin/productos",
        label: "Productos",
        activePrefixes: ["/admin/productos", "/admin/catalogo-base"],
        children: [
          { href: "/admin/productos", label: "Productos" },
          { href: "/admin/catalogo-base#categorias", label: "Categorías" },
          { href: "/admin/catalogo-base#talles", label: "Talles" },
          { href: "/admin/catalogo-base#colores", label: "Colores" },
        ],
      },
      { href: "/admin/inventario", label: "Inventario" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/envios", label: "Envíos" },
    ],
  },
  {
    title: "Contenido",
    items: [
      { href: "/admin/outfits", label: "Outfits" },
      { href: "/admin/universo", label: "Universe" },
      { href: "/admin/aventuras", label: "G&K Adventures" },
      { href: "/admin/eventos", label: "Events" },
      { href: "/admin/universo?tipo=campaign", label: "Campaigns" },
      { href: "/admin/universo?tipo=production", label: "Productions" },
      { href: "/admin/universo?tipo=season", label: "Seasons" },
      { href: "/admin/universo?tipo=collaboration", label: "Collaborations" },
    ],
  },
  {
    title: "Comunidad",
    items: [
      { href: "/admin/familia", label: "Familia / Members" },
      { href: "/admin/familia#camino", label: "Camino G&K" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href: "/admin/configuracion", label: "Configuración general" },
      // Hero de Home, Nosotros y Help: contenido general del sitio (no es Universe).
      { href: "/admin/contenido", label: "Contenido general" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href.includes("?") || item.href.includes("#")) return false;
  if (item.href === "/admin") return pathname === "/admin";
  return (item.activePrefixes ?? [item.href]).some((prefix) => pathname.startsWith(prefix));
}

// Solo resalta el link activo -- UI pura, sin lógica de negocio. Es el
// único pedazo del shell que necesita ser Client Component (usePathname).
export function AdminNav() {
  const pathname = usePathname();
  const link = (item: NavItem, sub = false) => (
    <Link
      key={`${item.label}-${item.href}`}
      href={item.href}
      className={`${isActive(item, pathname) && !item.children ? styles.navLinkActive : styles.navLink}${sub ? ` ${styles.navSub}` : ""}`}
    >
      {item.label}
    </Link>
  );

  return (
    <nav className={styles.nav}>
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className={styles.navGroup}>
          <span className={styles.navGroupTitle}>{group.title}</span>
          {group.items.map((item) =>
            item.children ? (
              <div key={item.label} className={styles.navGroup}>
                <span className={isActive(item, pathname) ? styles.navLinkActive : styles.navLink}>{item.label}</span>
                {item.children.map((child) => link(child, true))}
              </div>
            ) : (
              link(item)
            ),
          )}
        </div>
      ))}
    </nav>
  );
}
