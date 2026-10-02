// Admin del Universo GXK 12:2 (Bible §26-§29, Admin Bible §34): campañas,
// producciones, temporadas, colaboraciones, audiovisual, Las Aventuras de
// G & K (temporadas -> capítulos -> aventuras) y eventos. Cliente de sesión:
// RLS admin_all_* (is_active_admin) es la barrera real.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { TablesInsert } from "@/types/database";
import { buildImageUrl } from "@/services/catalog";

export const UNIVERSE_KINDS = ["campaign", "production", "season", "collaboration", "audiovisual"] as const;
export type UniverseKind = (typeof UNIVERSE_KINDS)[number];
// Bible §26.
export const UNIVERSE_KIND_LABELS: Record<UniverseKind, string> = {
  campaign: "Campaña",
  production: "Producción",
  season: "Temporada",
  collaboration: "Colaboración",
  audiovisual: "Audiovisual",
};

export const EVENT_KINDS = ["showroom", "collaboration", "event", "experience"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
// Bible §29.
export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  showroom: "Showroom",
  collaboration: "Colaboración",
  event: "Evento",
  experience: "Experiencia",
};

export const CONTENT_STATUSES = ["draft", "published", "hidden"] as const;
export const SEASON_STATUSES = ["draft", "published", "coming_soon", "hidden"] as const;
export const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  coming_soon: "Coming soon",
};

export function imageUrl(supabase: GxkSupabaseClient, path: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : buildImageUrl(supabase, path);
}

// ----------------------------------------------------------------------------
// Entradas del Universo
// ----------------------------------------------------------------------------

export type UniverseEntryInput = {
  kind: UniverseKind;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  videoUrl: string | null;
  status: (typeof CONTENT_STATUSES)[number];
  membersOnly: boolean;
  /** false = la entrada existe solo como contexto (p. ej. una temporada), sin página pública propia. */
  hasPage: boolean;
  publishedAt: string;
  sortOrder: number;
};

export type AdminUniverseEntry = UniverseEntryInput & {
  id: string;
  coverPath: string | null;
  coverUrl: string | null;
};

type EntryRow = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  video_url: string | null;
  status: string;
  members_only: boolean;
  has_page: boolean;
  published_at: string;
  sort_order: number;
  cover_path: string | null;
};

const ENTRY_COLUMNS = "id, kind, title, slug, summary, body, video_url, status, members_only, has_page, published_at, sort_order, cover_path";

function toEntry(supabase: GxkSupabaseClient, row: EntryRow): AdminUniverseEntry {
  return {
    id: row.id,
    kind: row.kind as UniverseKind,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    videoUrl: row.video_url,
    status: row.status as UniverseEntryInput["status"],
    membersOnly: row.members_only,
    hasPage: row.has_page,
    publishedAt: row.published_at,
    sortOrder: row.sort_order,
    coverPath: row.cover_path,
    coverUrl: imageUrl(supabase, row.cover_path),
  };
}

function entryRow(input: UniverseEntryInput): TablesInsert<"universe_entries"> {
  return {
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    body: input.body,
    video_url: input.videoUrl,
    status: input.status,
    members_only: input.membersOnly,
    has_page: input.hasPage,
    published_at: input.publishedAt,
    sort_order: input.sortOrder,
  };
}

export async function getAdminUniverseEntries(supabase: GxkSupabaseClient): Promise<AdminUniverseEntry[]> {
  const { data, error } = await supabase
    .from("universe_entries")
    .select(ENTRY_COLUMNS)
    .order("published_at", { ascending: false })
    .returns<EntryRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => toEntry(supabase, row));
}

export type AdminUniverseEntryDetail = AdminUniverseEntry & {
  media: { id: string; url: string; path: string; altText: string | null; sortOrder: number }[];
  products: { productId: string; name: string; sortOrder: number }[];
  outfits: { outfitId: string; name: string; sortOrder: number }[];
};

export async function getAdminUniverseEntry(supabase: GxkSupabaseClient, id: string): Promise<AdminUniverseEntryDetail | null> {
  const { data, error } = await supabase.from("universe_entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle().returns<EntryRow>();
  if (error) throw error;
  if (!data) return null;
  const [mediaRes, productsRes, outfitsRes] = await Promise.all([
    supabase.from("universe_entry_media").select("id, storage_path, alt_text, sort_order").eq("entry_id", id).order("sort_order"),
    supabase
      .from("universe_entry_products")
      .select("product_id, sort_order, products ( name )")
      .eq("entry_id", id)
      .order("sort_order")
      .returns<{ product_id: string; sort_order: number; products: { name: string } | null }[]>(),
    supabase
      .from("universe_entry_outfits")
      .select("outfit_id, sort_order, outfits ( name )")
      .eq("entry_id", id)
      .order("sort_order")
      .returns<{ outfit_id: string; sort_order: number; outfits: { name: string } | null }[]>(),
  ]);
  if (mediaRes.error) throw mediaRes.error;
  if (productsRes.error) throw productsRes.error;
  if (outfitsRes.error) throw outfitsRes.error;
  return {
    ...toEntry(supabase, data),
    media: (mediaRes.data ?? []).map((row) => ({
      id: row.id,
      path: row.storage_path,
      url: imageUrl(supabase, row.storage_path) ?? "",
      altText: row.alt_text,
      sortOrder: row.sort_order,
    })),
    products: (productsRes.data ?? []).map((row) => ({ productId: row.product_id, name: row.products?.name ?? "—", sortOrder: row.sort_order })),
    outfits: (outfitsRes.data ?? []).map((row) => ({ outfitId: row.outfit_id, name: row.outfits?.name ?? "—", sortOrder: row.sort_order })),
  };
}

export async function createUniverseEntry(supabase: GxkSupabaseClient, input: UniverseEntryInput): Promise<string> {
  const { data, error } = await supabase.from("universe_entries").insert(entryRow(input)).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateUniverseEntry(supabase: GxkSupabaseClient, id: string, input: UniverseEntryInput): Promise<void> {
  const { error } = await supabase.from("universe_entries").update(entryRow(input)).eq("id", id);
  if (error) throw error;
}

export async function deleteUniverseEntry(supabase: GxkSupabaseClient, id: string): Promise<string[]> {
  const { data: media } = await supabase.from("universe_entry_media").select("storage_path").eq("entry_id", id);
  const { data: entry } = await supabase.from("universe_entries").select("cover_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("universe_entries").delete().eq("id", id);
  if (error) throw error;
  return [...(media ?? []).map((row) => row.storage_path), ...(entry?.cover_path ? [entry.cover_path] : [])];
}

export async function setUniverseEntryCover(supabase: GxkSupabaseClient, id: string, path: string | null): Promise<void> {
  const { error } = await supabase.from("universe_entries").update({ cover_path: path }).eq("id", id);
  if (error) throw error;
}

export async function addUniverseEntryMedia(
  supabase: GxkSupabaseClient,
  entryId: string,
  path: string,
  altText: string | null,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase.from("universe_entry_media").insert({ entry_id: entryId, storage_path: path, alt_text: altText, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteUniverseEntryMedia(supabase: GxkSupabaseClient, mediaId: string): Promise<string | null> {
  const { data } = await supabase.from("universe_entry_media").select("storage_path").eq("id", mediaId).maybeSingle();
  const { error } = await supabase.from("universe_entry_media").delete().eq("id", mediaId);
  if (error) throw error;
  return data?.storage_path ?? null;
}

export async function linkUniverseEntryProduct(supabase: GxkSupabaseClient, entryId: string, productId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from("universe_entry_products")
    .upsert({ entry_id: entryId, product_id: productId, sort_order: sortOrder }, { onConflict: "entry_id,product_id" });
  if (error) throw error;
}

export async function unlinkUniverseEntryProduct(supabase: GxkSupabaseClient, entryId: string, productId: string): Promise<void> {
  const { error } = await supabase.from("universe_entry_products").delete().eq("entry_id", entryId).eq("product_id", productId);
  if (error) throw error;
}

export async function linkUniverseEntryOutfit(supabase: GxkSupabaseClient, entryId: string, outfitId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from("universe_entry_outfits")
    .upsert({ entry_id: entryId, outfit_id: outfitId, sort_order: sortOrder }, { onConflict: "entry_id,outfit_id" });
  if (error) throw error;
}

export async function unlinkUniverseEntryOutfit(supabase: GxkSupabaseClient, entryId: string, outfitId: string): Promise<void> {
  const { error } = await supabase.from("universe_entry_outfits").delete().eq("entry_id", entryId).eq("outfit_id", outfitId);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Las Aventuras de G & K: temporadas -> capítulos -> aventuras (Bible §28)
// ----------------------------------------------------------------------------

export type AdminSeason = {
  id: string;
  number: number;
  title: string;
  slug: string;
  summary: string | null;
  status: string;
  coverPath: string | null;
  coverUrl: string | null;
  chapterCount: number;
};

export async function getAdminSeasons(supabase: GxkSupabaseClient): Promise<AdminSeason[]> {
  const { data, error } = await supabase
    .from("adventure_seasons")
    .select("id, number, title, slug, summary, status, cover_path, adventure_chapters ( id )")
    .order("number")
    .returns<
      {
        id: string;
        number: number;
        title: string;
        slug: string;
        summary: string | null;
        status: string;
        cover_path: string | null;
        adventure_chapters: { id: string }[];
      }[]
    >();
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    status: row.status,
    coverPath: row.cover_path,
    coverUrl: imageUrl(supabase, row.cover_path),
    chapterCount: row.adventure_chapters.length,
  }));
}

export type SeasonInput = { number: number; title: string; slug: string; summary: string | null; status: (typeof SEASON_STATUSES)[number] };

export async function saveSeason(supabase: GxkSupabaseClient, id: string | null, input: SeasonInput): Promise<string> {
  const values = { number: input.number, title: input.title, slug: input.slug, summary: input.summary, status: input.status };
  if (id) {
    const { error } = await supabase.from("adventure_seasons").update(values).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("adventure_seasons").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export type AdminChapter = {
  id: string;
  seasonId: string;
  label: string;
  title: string | null;
  slug: string;
  summary: string | null;
  status: string;
  sortOrder: number;
  coverPath: string | null;
  coverUrl: string | null;
};

type ChapterRow = {
  id: string;
  season_id: string;
  label: string;
  title: string | null;
  slug: string;
  summary: string | null;
  status: string;
  sort_order: number;
  cover_path: string | null;
};

function toChapter(supabase: GxkSupabaseClient, row: ChapterRow): AdminChapter {
  return {
    id: row.id,
    seasonId: row.season_id,
    label: row.label,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    status: row.status,
    sortOrder: row.sort_order,
    coverPath: row.cover_path,
    coverUrl: imageUrl(supabase, row.cover_path),
  };
}

export async function getAdminSeason(supabase: GxkSupabaseClient, id: string): Promise<{ season: AdminSeason; chapters: AdminChapter[] } | null> {
  const seasons = await getAdminSeasons(supabase);
  const season = seasons.find((s) => s.id === id);
  if (!season) return null;
  const { data, error } = await supabase
    .from("adventure_chapters")
    .select("id, season_id, label, title, slug, summary, status, sort_order, cover_path")
    .eq("season_id", id)
    .order("sort_order")
    .returns<ChapterRow[]>();
  if (error) throw error;
  return { season, chapters: (data ?? []).map((row) => toChapter(supabase, row)) };
}

export type ChapterInput = {
  label: string;
  title: string | null;
  slug: string;
  summary: string | null;
  status: (typeof CONTENT_STATUSES)[number];
  sortOrder: number;
};

export async function saveChapter(supabase: GxkSupabaseClient, seasonId: string, id: string | null, input: ChapterInput): Promise<string> {
  const values = {
    season_id: seasonId,
    label: input.label,
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    status: input.status,
    sort_order: input.sortOrder,
  };
  if (id) {
    const { error } = await supabase.from("adventure_chapters").update(values).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("adventure_chapters").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

export type AdminAdventure = {
  id: string;
  title: string;
  body: string | null;
  videoUrl: string | null;
  status: string;
  sortOrder: number;
  coverPath: string | null;
  coverUrl: string | null;
};

export async function getAdminChapter(
  supabase: GxkSupabaseClient,
  id: string,
): Promise<{ chapter: AdminChapter; season: { id: string; title: string; number: number }; adventures: AdminAdventure[] } | null> {
  const { data, error } = await supabase
    .from("adventure_chapters")
    .select("id, season_id, label, title, slug, summary, status, sort_order, cover_path, adventure_seasons ( id, title, number )")
    .eq("id", id)
    .maybeSingle()
    .returns<ChapterRow & { adventure_seasons: { id: string; title: string; number: number } | null }>();
  if (error) throw error;
  if (!data || !data.adventure_seasons) return null;
  const { data: adventures, error: adventuresError } = await supabase
    .from("adventures")
    .select("id, title, body, video_url, status, sort_order, cover_path")
    .eq("chapter_id", id)
    .order("sort_order");
  if (adventuresError) throw adventuresError;
  return {
    chapter: toChapter(supabase, data),
    season: data.adventure_seasons,
    adventures: (adventures ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      videoUrl: row.video_url,
      status: row.status,
      sortOrder: row.sort_order,
      coverPath: row.cover_path,
      coverUrl: imageUrl(supabase, row.cover_path),
    })),
  };
}

export type AdventureInput = {
  title: string;
  body: string | null;
  videoUrl: string | null;
  status: (typeof CONTENT_STATUSES)[number];
  sortOrder: number;
};

export async function saveAdventure(supabase: GxkSupabaseClient, chapterId: string, id: string | null, input: AdventureInput): Promise<void> {
  const values = {
    chapter_id: chapterId,
    title: input.title,
    body: input.body,
    video_url: input.videoUrl,
    status: input.status,
    sort_order: input.sortOrder,
  };
  const { error } = id ? await supabase.from("adventures").update(values).eq("id", id) : await supabase.from("adventures").insert(values);
  if (error) throw error;
}

export async function deleteRow(
  supabase: GxkSupabaseClient,
  table: "adventure_seasons" | "adventure_chapters" | "adventures" | "events",
  id: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function setCover(
  supabase: GxkSupabaseClient,
  table: "adventure_seasons" | "adventure_chapters" | "adventures" | "events",
  id: string,
  path: string | null,
): Promise<void> {
  const { error } = await supabase.from(table).update({ cover_path: path }).eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Eventos (Bible §29)
// ----------------------------------------------------------------------------

export type EventInput = {
  kind: EventKind;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string | null;
  place: string | null;
  schedule: string | null;
  description: string | null;
  participation: string | null;
  extraInfo: string | null;
  status: (typeof CONTENT_STATUSES)[number];
  membersOnly: boolean;
};

export type AdminEvent = EventInput & { id: string; coverPath: string | null; coverUrl: string | null };

type EventRow = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  schedule: string | null;
  description: string | null;
  participation: string | null;
  extra_info: string | null;
  status: string;
  members_only: boolean;
  cover_path: string | null;
};

const EVENT_COLUMNS = "id, kind, title, slug, starts_at, ends_at, place, schedule, description, participation, extra_info, status, members_only, cover_path";

function toEvent(supabase: GxkSupabaseClient, row: EventRow): AdminEvent {
  return {
    id: row.id,
    kind: row.kind as EventKind,
    title: row.title,
    slug: row.slug,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    schedule: row.schedule,
    description: row.description,
    participation: row.participation,
    extraInfo: row.extra_info,
    status: row.status as EventInput["status"],
    membersOnly: row.members_only,
    coverPath: row.cover_path,
    coverUrl: imageUrl(supabase, row.cover_path),
  };
}

export async function getAdminEvents(supabase: GxkSupabaseClient): Promise<AdminEvent[]> {
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).order("starts_at", { ascending: false }).returns<EventRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => toEvent(supabase, row));
}

export async function getAdminEvent(supabase: GxkSupabaseClient, id: string): Promise<AdminEvent | null> {
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle().returns<EventRow>();
  if (error) throw error;
  return data ? toEvent(supabase, data) : null;
}

export async function saveEvent(supabase: GxkSupabaseClient, id: string | null, input: EventInput): Promise<string> {
  const values = {
    kind: input.kind,
    title: input.title,
    slug: input.slug,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    place: input.place,
    schedule: input.schedule,
    description: input.description,
    participation: input.participation,
    extra_info: input.extraInfo,
    status: input.status,
    members_only: input.membersOnly,
  };
  if (id) {
    const { error } = await supabase.from("events").update(values).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("events").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}
