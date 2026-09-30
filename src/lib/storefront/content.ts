// Contenido y parámetros de la Home. Solo entra acá lo que la Bible define
// literalmente o lo que es un parámetro técnico marcado como provisorio.
// Todo lo que requiere definición de GXK queda en `null` y las secciones lo
// omiten: reemplazar el valor alcanza, sin rehacer funcionalidad.

// Bible §1 (esencia y slogan) y §2 (nombre).
export const BRAND_NAME = "GXK 12:2";
export const SLOGAN = "NO TE CONFORMES. TRANSFORMATE.";

// Bible §13 "Dos velocidades": QUIERO COMPRAR (encontrar → elegir → pagar) y
// QUIERO EXPLORAR (outfits → campañas → historias → …). Hoy lo explorable que
// existe es Outfits; el resto de ese recorrido pertenece a los Bloques 5 y 6.
export const HERO_ENTRIES = [
  { key: "comprar", label: "QUIERO COMPRAR", href: "/catalogo" },
  { key: "explorar", label: "QUIERO EXPLORAR", href: "/#outfits" },
] as const;

/**
 * Foto/imagen del hero. PENDIENTE DE CONTENIDO: no existe campaña ni
 * fotografía definida. Con `null` el hero no muestra imagen; al cargar
 * `{ imageUrl, alt }` se renderiza sin tocar el componente.
 */
export const HERO_MEDIA: { imageUrl: string; alt: string } | null = null;

// Parámetros provisorios: la documentación no los define.
export const HOME_LIMITS = {
  /** Cantidad de "Nuevos ingresos" en Home. PROVISORIO: no definido en Bible/Roadmap. */
  newArrivals: 8,
  /** Outfits en Home. PROVISORIO: no definido; `undefined` = todos los vigentes. */
  outfits: undefined as number | undefined,
};

// Secciones de entrada de Home sin datos propios todavía. `description`
// queda en null hasta que GXK defina el texto (no se inventa copy).
export type HomeEntrySectionConfig = {
  id: string;
  title: string;
  description: string | null;
  entryKeys: string[];
};

export const HOME_ENTRY_SECTIONS = {
  // Bible §26: "UNIVERSO GXK 12:2" — archivo creativo (Bloque 5).
  universo: { id: "universo", title: "Universo", description: null, entryKeys: ["universo"] },
  // Bible §8/§28: G y K son anfitriones y narradores; sus historias viven en
  // Las Aventuras de G & K (Universo, Bloque 5).
  gk: { id: "gk", title: "G & K", description: null, entryKeys: ["aventuras"] },
  // Bible §23/§24: Members Only se accede desde FAMILIA GxK (Bloque 6).
  members: { id: "members", title: "Members Only", description: null, entryKeys: ["familia"] },
} satisfies Record<string, HomeEntrySectionConfig>;
