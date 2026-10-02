// Relaciones editoriales N:N (Admin Control, Fase A). Todas opcionales y sin
// jerarquía: Universe <-> Universe, capítulo de G & K <-> Universe/productos/
// outfits y evento <-> Universe/capítulos/productos/outfits. Cada relación se
// edita desde su "dueño" (la entrada, el capítulo o el evento). RLS
// admin_all_* es la barrera real.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { getAdminUniverseEntries, UNIVERSE_KIND_LABELS } from "./universe";
import { getAdminOutfits, getProductPickerOptions } from "./outfits";

export const RELATIONS = {
  entry_entry: { table: "universe_entry_relations", owner: "entry_id", target: "related_entry_id" },
  chapter_entry: { table: "adventure_chapter_entries", owner: "chapter_id", target: "entry_id" },
  chapter_product: { table: "adventure_chapter_products", owner: "chapter_id", target: "product_id" },
  chapter_outfit: { table: "adventure_chapter_outfits", owner: "chapter_id", target: "outfit_id" },
  event_entry: { table: "event_entries", owner: "event_id", target: "entry_id" },
  event_chapter: { table: "event_adventure_chapters", owner: "event_id", target: "chapter_id" },
  event_product: { table: "event_products", owner: "event_id", target: "product_id" },
  event_outfit: { table: "event_outfits", owner: "event_id", target: "outfit_id" },
} as const;

export type RelationKey = keyof typeof RELATIONS;

export function isRelationKey(value: string): value is RelationKey {
  return Object.prototype.hasOwnProperty.call(RELATIONS, value);
}

// Las tablas de relación comparten forma (owner, target, sort_order); se
// accede con un cliente sin tipar para no repetir ocho veces el mismo código.
function untyped(supabase: GxkSupabaseClient): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

type LinkRow = Record<string, string | number>;

/** Universe <-> Universe es simétrica: cada par se guarda una sola vez (menor id primero). */
function entryPair(a: string, b: string): { entry_id: string; related_entry_id: string } {
  return a < b ? { entry_id: a, related_entry_id: b } : { entry_id: b, related_entry_id: a };
}

/** Ids relacionados a `ownerId`, en el orden configurado. */
export async function getLinkedIds(supabase: GxkSupabaseClient, key: RelationKey, ownerId: string): Promise<string[]> {
  const { table, owner, target } = RELATIONS[key];
  // El id va dentro de un filtro .or(): solo se aceptan UUIDs.
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) return [];
  let query = untyped(supabase).from(table).select("*");
  query = key === "entry_entry" ? query.or(`entry_id.eq.${ownerId},related_entry_id.eq.${ownerId}`) : query.eq(owner, ownerId);
  const { data, error } = await query.order("sort_order");
  if (error) throw error;
  return ((data ?? []) as LinkRow[]).map((row) =>
    key === "entry_entry" ? String(row.entry_id === ownerId ? row.related_entry_id : row.entry_id) : String(row[target]),
  );
}

export async function linkRelation(
  supabase: GxkSupabaseClient,
  key: RelationKey,
  ownerId: string,
  targetId: string,
  sortOrder: number,
): Promise<void> {
  const { table, owner, target } = RELATIONS[key];
  if (key === "entry_entry" && ownerId === targetId) throw new Error("self_relation");
  const row = key === "entry_entry" ? { ...entryPair(ownerId, targetId), sort_order: sortOrder } : { [owner]: ownerId, [target]: targetId, sort_order: sortOrder };
  const { error } = await untyped(supabase).from(table).upsert(row, { onConflict: `${owner},${target}` });
  if (error) throw error;
}

export async function unlinkRelation(supabase: GxkSupabaseClient, key: RelationKey, ownerId: string, targetId: string): Promise<void> {
  const { table, owner, target } = RELATIONS[key];
  const match = key === "entry_entry" ? entryPair(ownerId, targetId) : { [owner]: ownerId, [target]: targetId };
  const { error } = await untyped(supabase).from(table).delete().match(match);
  if (error) throw error;
}

/** Capítulos de G & K para elegir en una relación ("S01 · Ch.1 Shitsurei"). */
export async function getChapterPickerOptions(supabase: GxkSupabaseClient): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("adventure_chapters")
    .select("id, label, title, sort_order, adventure_seasons ( number )")
    .returns<{ id: string; label: string; title: string | null; sort_order: number; adventure_seasons: { number: number } | null }[]>();
  if (error) throw error;
  return (data ?? [])
    .sort((a, b) => (a.adventure_seasons?.number ?? 0) - (b.adventure_seasons?.number ?? 0) || a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      name: `S${String(row.adventure_seasons?.number ?? 0).padStart(2, "0")} · ${row.label}${row.title ? ` ${row.title}` : ""}`,
    }));
}

export type RelationOption = { id: string; name: string; href: string };

/** Opciones para los selectores de relaciones, con enlace a su edición en Admin. */
export async function getRelationOptions(supabase: GxkSupabaseClient): Promise<{
  entries: RelationOption[];
  chapters: RelationOption[];
  products: RelationOption[];
  outfits: RelationOption[];
}> {
  const [entries, chapters, products, outfits] = await Promise.all([
    getAdminUniverseEntries(supabase),
    getChapterPickerOptions(supabase),
    getProductPickerOptions(supabase),
    getAdminOutfits(supabase),
  ]);
  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      name: `${UNIVERSE_KIND_LABELS[entry.kind]} · ${entry.title}`,
      href: `/admin/universo/${entry.id}`,
    })),
    chapters: chapters.map((chapter) => ({ ...chapter, href: `/admin/aventuras/capitulo/${chapter.id}` })),
    products: products.map((product) => ({ id: product.id, name: product.name, href: `/admin/productos/${product.id}` })),
    outfits: outfits.map((outfit) => ({ id: outfit.id, name: outfit.name, href: `/admin/outfits/${outfit.id}` })),
  };
}
