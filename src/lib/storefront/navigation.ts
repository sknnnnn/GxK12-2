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
  { key: "universo", label: "UNIVERSO", href: null, dependsOn: "Bloque 5 — Universo GXK (rutas y datos)" },
  { key: "eventos", label: "EVENTOS", href: null, dependsOn: "Bloque 5 — Eventos (modelo de datos y rutas)" },
  {
    key: "nosotros",
    label: "NOSOTROS",
    href: null,
    dependsOn: "Página sin bloque asignado en el Roadmap; contenido según Bible §30 (a definir)",
  },
];

// Accesos: BUSCAR · FAMILIA GxK 🐾 · FAVORITOS · CARRITO
// CARRITO no figura acá: lo renderiza CartLink (necesita el contador del carrito).
export const ACCESS_LINKS: SiteLink[] = [
  { key: "buscar", label: "BUSCAR", href: null, dependsOn: "Bloque 2 — búsqueda" },
  { key: "familia", label: "FAMILIA GxK 🐾", href: null, dependsOn: "Bloque 6 — Familia GxK (registro, Mi Casa)" },
  { key: "favoritos", label: "FAVORITOS", href: null, dependsOn: "Bloque 2/6 — favoritos (Mi Casa)" },
];

// Entradas de Home que no son del menú (Bible §28). Sin ruta hasta el Bloque 5.
export const EXTRA_LINKS: SiteLink[] = [
  { key: "aventuras", label: "Las Aventuras de G & K", href: null, dependsOn: "Bloque 5 — Aventuras (temporadas/capítulos)" },
];

export function getMenuLink(key: string): SiteLink {
  const link = [...MENU_LINKS, ...ACCESS_LINKS, ...FOOTER_LINKS, ...EXTRA_LINKS].find((l) => l.key === key);
  if (!link) throw new Error(`Link de navegación desconocido: ${key}`);
  return link;
}

// Footer: Help es "un único lugar" (Bible §31: cómo comprar, talles, envíos,
// cambios, pagos, FAQ, contacto). Todavía no tiene ruta ni contenido.
export const FOOTER_LINKS: SiteLink[] = [
  { key: "help", label: "Help", href: null, dependsOn: "Página Help (Bible §31): sin bloque asignado; contenido a definir" },
];

// Datos que el footer mostraría y que NO están definidos: null = no se
// renderiza nada. Completar cuando GXK los defina; no inventar.
export const SOCIAL_LINKS: { key: string; label: string; href: string | null }[] = [
  { key: "instagram", label: "Instagram", href: null }, // Bible §35: enlace; URL no definida
  { key: "tiktok", label: "TikTok", href: null }, // Bible §35: enlace; URL no definida
];

export const CONTACT = {
  /** Número/enlace de WhatsApp (Bible §22). No definido. */
  whatsappHref: null as string | null,
};
