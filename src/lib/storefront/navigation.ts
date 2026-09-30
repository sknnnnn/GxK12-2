// Navegación pública del Storefront (Bible §14). Fuente única para header,
// footer y las entradas de Home: ninguna interfaz hardcodea rutas.
//
// `href: null` = la ruta/sistema todavía no existe. No se inventa una
// implementación paralela: el link se muestra inerte (ver SiteLinkItem) y
// `dependsOn` documenta qué lo habilita. Cuando exista la ruta real, se
// completa acá y aparece en todos lados sin tocar componentes.

export type SiteLink = {
  key: string;
  /** Etiqueta exactamente como la define la Bible. */
  label: string;
  href: string | null;
  /** Qué bloque/decisión habilita este link mientras `href` sea null. */
  dependsOn?: string;
};

// Menú: TIENDA · OUTFITS · UNIVERSO · EVENTOS · NOSOTROS
export const MENU_LINKS: SiteLink[] = [
  { key: "tienda", label: "TIENDA", href: "/catalogo" },
  // No hay página de outfits en el Roadmap: los outfits viven hoy en la
  // sección de Home (Bible §12/§15). Se navega a esa sección; si más
  // adelante se define una página propia, cambia solo este href.
  { key: "outfits", label: "OUTFITS", href: "/#outfits" },
  { key: "universo", label: "UNIVERSO", href: "/universo" },
  { key: "eventos", label: "EVENTOS", href: "/eventos" },
  { key: "nosotros", label: "NOSOTROS", href: "/nosotros" },
];

// Accesos: BUSCAR · FAMILIA GxK 🐾 · FAVORITOS · CARRITO
// CARRITO no figura acá: lo renderiza CartLink (necesita el contador del carrito).
export const ACCESS_LINKS: SiteLink[] = [
  { key: "buscar", label: "BUSCAR", href: "/buscar" },
  { key: "familia", label: "FAMILIA GxK 🐾", href: null, dependsOn: "Bloque 6 — Familia GxK (registro, Mi Casa)" },
  { key: "favoritos", label: "FAVORITOS", href: "/favoritos" },
];

// Entradas de Home que no son del menú (Bible §28). Sin ruta hasta el Bloque 5.
export const EXTRA_LINKS: SiteLink[] = [
  { key: "aventuras", label: "Las Aventuras de G & K", href: "/universo/aventuras" },
];

export function getMenuLink(key: string): SiteLink {
  const link = [...MENU_LINKS, ...ACCESS_LINKS, ...FOOTER_LINKS, ...EXTRA_LINKS].find((l) => l.key === key);
  if (!link) throw new Error(`Link de navegación desconocido: ${key}`);
  return link;
}

// Footer: Help es "un único lugar" (Bible §31: cómo comprar, talles, envíos,
// cambios, pagos, FAQ, contacto) y el seguimiento del pedido (Bible §33).
export const FOOTER_LINKS: SiteLink[] = [
  { key: "help", label: "Help", href: "/help" },
  { key: "seguimiento", label: "Seguimiento", href: "/seguimiento" },
];
