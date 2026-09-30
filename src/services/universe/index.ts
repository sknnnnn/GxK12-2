// Universo GXK 12:2 (Bible §26-§29): lectura pública. Archivo creativo de
// campañas, producciones, temporadas, colaboraciones, audiovisual, Las
// Aventuras de G & K y eventos. "Una prenda puede agotarse. La historia
// permanece.": las entradas no dependen del stock de sus productos.
//
// Convención de GXK Core: recibe un GxkSupabaseClient ya construido. Todo
// pasa por RLS: el público ve lo publicado y no exclusivo; con sesión de
// Familia GxK (Bloque 6) RLS también deja ver lo Members Only.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { buildImageUrl } from "@/services/catalog";

export const UNIVERSE_KIND_LABELS: Record<string, string> = {
  campaign: "Campaña",
  production: "Producción",
  season: "Temporada",
  collaboration: "Colaboración",
  audiovisual: "Audiovisual",
};
export const UNIVERSE_KIND_SLUGS: Record<string, string> = {
  campaign: "campanas",
  production: "producciones",
  season: "temporadas",
  collaboration: "colaboraciones",
  audiovisual: "audiovisual",
};

export const EVENT_KIND_LABELS: Record<string, string> = {
  showroom: "Showroom",
  collaboration: "Colaboración",
  event: "Evento",
  experience: "Experiencia",
};

function image(supabase: GxkSupabaseClient, path: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : buildImageUrl(supabase, path);
}

// ----------------------------------------------------------------------------
// Entradas
// ----------------------------------------------------------------------------

export type UniverseEntrySummary = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  publishedAt: string;
  membersOnly: boolean;
};

type EntryRow = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_path: string | null;
  published_at: string;
  members_only: boolean;
};

function toSummary(supabase: GxkSupabaseClient, row: EntryRow): UniverseEntrySummary {
  return {
    id: row.id,
    kind: row.kind,
    kindLabel: UNIVERSE_KIND_LABELS[row.kind] ?? row.kind,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    coverUrl: image(supabase, row.cover_path),
    publishedAt: row.published_at,
    membersOnly: row.members_only,
  };
}

export async function getUniverseEntries(
  supabase: GxkSupabaseClient,
  options: { kind?: string; limit?: number; membersOnly?: boolean } = {},
): Promise<UniverseEntrySummary[]> {
  let query = supabase
    .from("universe_entries")
    .select("id, kind, title, slug, summary, cover_path, published_at, members_only")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .order("sort_order", { ascending: true });
  if (options.kind) query = query.eq("kind", options.kind);
  if (options.membersOnly !== undefined) query = query.eq("members_only", options.membersOnly);
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query.returns<EntryRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => toSummary(supabase, row));
}

export type UniverseEntryDetail = UniverseEntrySummary & {
  body: string | null;
  videoUrl: string | null;
  media: { id: string; url: string; altText: string | null }[];
  productIds: string[];
  outfitIds: string[];
};

export async function getUniverseEntryBySlug(supabase: GxkSupabaseClient, slug: string): Promise<UniverseEntryDetail | null> {
  const { data, error } = await supabase
    .from("universe_entries")
    .select("id, kind, title, slug, summary, body, video_url, cover_path, published_at, members_only")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()
    .returns<EntryRow & { body: string | null; video_url: string | null }>();
  if (error) throw error;
  if (!data) return null;
  const [mediaRes, productsRes, outfitsRes] = await Promise.all([
    supabase.from("universe_entry_media").select("id, storage_path, alt_text").eq("entry_id", data.id).order("sort_order"),
    supabase.from("universe_entry_products").select("product_id").eq("entry_id", data.id).order("sort_order"),
    supabase.from("universe_entry_outfits").select("outfit_id").eq("entry_id", data.id).order("sort_order"),
  ]);
  if (mediaRes.error) throw mediaRes.error;
  if (productsRes.error) throw productsRes.error;
  if (outfitsRes.error) throw outfitsRes.error;
  return {
    ...toSummary(supabase, data),
    body: data.body,
    videoUrl: data.video_url,
    media: (mediaRes.data ?? []).map((row) => ({ id: row.id, url: image(supabase, row.storage_path) ?? "", altText: row.alt_text })),
    productIds: (productsRes.data ?? []).map((row) => row.product_id),
    outfitIds: (outfitsRes.data ?? []).map((row) => row.outfit_id),
  };
}

// ----------------------------------------------------------------------------
// Las Aventuras de G & K (Bible §28): temporadas -> capítulos -> aventuras
// ----------------------------------------------------------------------------

export type AdventureChapterSummary = {
  id: string;
  label: string;
  title: string | null;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
};

export type AdventureSeason = {
  id: string;
  number: number;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  comingSoon: boolean;
  chapters: AdventureChapterSummary[];
};

export async function getAdventureSeasons(supabase: GxkSupabaseClient): Promise<AdventureSeason[]> {
  const [seasonsRes, chaptersRes] = await Promise.all([
    supabase.from("adventure_seasons").select("id, number, title, slug, summary, cover_path, status").order("number"),
    supabase.from("adventure_chapters").select("id, season_id, label, title, slug, summary, cover_path").order("sort_order"),
  ]);
  if (seasonsRes.error) throw seasonsRes.error;
  if (chaptersRes.error) throw chaptersRes.error;
  return (seasonsRes.data ?? []).map((season) => ({
    id: season.id,
    number: season.number,
    title: season.title,
    slug: season.slug,
    summary: season.summary,
    coverUrl: image(supabase, season.cover_path),
    comingSoon: season.status === "coming_soon",
    chapters:
      season.status === "coming_soon"
        ? []
        : (chaptersRes.data ?? [])
            .filter((chapter) => chapter.season_id === season.id)
            .map((chapter) => ({
              id: chapter.id,
              label: chapter.label,
              title: chapter.title,
              slug: chapter.slug,
              summary: chapter.summary,
              coverUrl: image(supabase, chapter.cover_path),
            })),
  }));
}

export type AdventureChapterDetail = {
  season: { number: number; title: string; slug: string };
  chapter: AdventureChapterSummary;
  adventures: { id: string; title: string; body: string | null; videoUrl: string | null; coverUrl: string | null }[];
  previous: AdventureChapterSummary | null;
  next: AdventureChapterSummary | null;
};

export async function getAdventureChapter(
  supabase: GxkSupabaseClient,
  seasonSlug: string,
  chapterSlug: string,
): Promise<AdventureChapterDetail | null> {
  const seasons = await getAdventureSeasons(supabase);
  const season = seasons.find((candidate) => candidate.slug === seasonSlug && !candidate.comingSoon);
  const index = season?.chapters.findIndex((chapter) => chapter.slug === chapterSlug) ?? -1;
  if (!season || index < 0) return null;
  const chapter = season.chapters[index];
  const { data, error } = await supabase
    .from("adventures")
    .select("id, title, body, video_url, cover_path")
    .eq("chapter_id", chapter.id)
    .order("sort_order");
  if (error) throw error;
  return {
    season: { number: season.number, title: season.title, slug: season.slug },
    chapter,
    adventures: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      videoUrl: row.video_url,
      coverUrl: image(supabase, row.cover_path),
    })),
    previous: season.chapters[index - 1] ?? null,
    next: season.chapters[index + 1] ?? null,
  };
}

// ----------------------------------------------------------------------------
// Eventos (Bible §29): próximos y archivo
// ----------------------------------------------------------------------------

export type PublicEvent = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string | null;
  place: string | null;
  schedule: string | null;
  description: string | null;
  participation: string | null;
  coverUrl: string | null;
  membersOnly: boolean;
};

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
  cover_path: string | null;
  members_only: boolean;
};

const EVENT_COLUMNS = "id, kind, title, slug, starts_at, ends_at, place, schedule, description, participation, cover_path, members_only";

function toEvent(supabase: GxkSupabaseClient, row: EventRow): PublicEvent {
  return {
    id: row.id,
    kind: row.kind,
    kindLabel: EVENT_KIND_LABELS[row.kind] ?? row.kind,
    title: row.title,
    slug: row.slug,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    schedule: row.schedule,
    description: row.description,
    participation: row.participation,
    coverUrl: image(supabase, row.cover_path),
    membersOnly: row.members_only,
  };
}

/** Un evento pasa a archivo cuando termina (o, sin fin, cuando empieza). */
export function isEventArchived(event: Pick<PublicEvent, "startsAt" | "endsAt">, now: Date): boolean {
  return new Date(event.endsAt ?? event.startsAt).getTime() < now.getTime();
}

export async function getEvents(
  supabase: GxkSupabaseClient,
  now: Date = new Date(),
): Promise<{ upcoming: PublicEvent[]; archive: PublicEvent[] }> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .returns<EventRow[]>();
  if (error) throw error;
  const events = (data ?? []).map((row) => toEvent(supabase, row));
  return {
    upcoming: events.filter((event) => !isEventArchived(event, now)),
    archive: events.filter((event) => isEventArchived(event, now)).reverse(),
  };
}

/** Próximo evento para Home (Bible §15: "Próximo evento si existe"). */
export async function getNextEvent(supabase: GxkSupabaseClient, now: Date = new Date()): Promise<PublicEvent | null> {
  const { upcoming } = await getEvents(supabase, now);
  return upcoming[0] ?? null;
}

export async function getEventBySlug(supabase: GxkSupabaseClient, slug: string): Promise<PublicEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()
    .returns<EventRow>();
  if (error) throw error;
  return data ? toEvent(supabase, data) : null;
}
