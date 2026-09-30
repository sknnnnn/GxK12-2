// Analytics (Bible §36): vistas, búsquedas, add to cart, abandono, ventas,
// conversión, outfits visitados/comprados, campañas que generan ventas,
// agotados y navegación. Eventos propios en Supabase (analytics_events),
// sin terceros.
//
// Convención de GXK Core: recibe un GxkSupabaseClient. El alta de eventos
// usa el cliente admin (server-only; la tabla no acepta inserts públicos);
// el resumen se lee con la sesión del admin (admin_analytics_summary valida
// is_active_admin()).

import type { GxkSupabaseClient } from "@/lib/supabase/types";

export const ANALYTICS_EVENTS = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "checkout_started",
  "order_created",
  "outfit_view",
  "entry_view",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/** Eventos que puede mandar el navegador (order_created lo registra solo el servidor). */
const CLIENT_EVENTS: ReadonlySet<string> = new Set(ANALYTICS_EVENTS.filter((event) => event !== "order_created"));

export type AnalyticsEvent = {
  event: AnalyticsEventName;
  sessionId: string;
  path?: string | null;
  productId?: string | null;
  outfitId?: string | null;
  entryId?: string | null;
  orderId?: string | null;
  query?: string | null;
  quantity?: number | null;
  value?: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = /^[A-Za-z0-9_-]{8,64}$/;

export function isAnalyticsSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION.test(value);
}

function uuidOrNull(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

/** Valida un evento enviado por el navegador; null si no es aceptable. */
export function parseClientAnalyticsEvent(raw: unknown): AnalyticsEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.event !== "string" || !CLIENT_EVENTS.has(record.event)) return null;
  if (!isAnalyticsSessionId(record.sessionId)) return null;
  const path = typeof record.path === "string" && record.path.startsWith("/") ? record.path.slice(0, 300) : null;
  const query = typeof record.query === "string" ? record.query.trim().slice(0, 120) || null : null;
  const quantity = typeof record.quantity === "number" && Number.isInteger(record.quantity) && record.quantity > 0 && record.quantity < 1000 ? record.quantity : null;
  return {
    event: record.event as AnalyticsEventName,
    sessionId: record.sessionId,
    path,
    productId: uuidOrNull(record.productId),
    outfitId: uuidOrNull(record.outfitId),
    entryId: uuidOrNull(record.entryId),
    query,
    quantity,
  };
}

export async function recordAnalyticsEvents(admin: GxkSupabaseClient, events: AnalyticsEvent[]): Promise<void> {
  if (events.length === 0) return;
  const { error } = await admin.from("analytics_events").insert(
    events.map((event) => ({
      event: event.event,
      session_id: event.sessionId,
      path: event.path ?? null,
      product_id: event.productId ?? null,
      outfit_id: event.outfitId ?? null,
      entry_id: event.entryId ?? null,
      order_id: event.orderId ?? null,
      query: event.query ?? null,
      quantity: event.quantity ?? null,
      value: event.value ?? null,
    })),
  );
  if (error) throw error;
}

export type AnalyticsSummary = {
  sessions: number;
  page_views: number;
  product_views: number;
  searches: number;
  add_to_cart: number;
  checkouts_started: number;
  cart_abandoned: number;
  checkout_abandoned: number;
  orders_created: number;
  orders_paid: number;
  revenue: number;
  sessions_with_order: number;
  top_paths: { path: string; n: number }[];
  top_searches: { query: string; n: number }[];
  top_products: { name: string; views: number; adds: number }[];
  outfits: { title: string; views: number; adds: number; orders_paid: number }[];
  entries: { title: string; views: number; orders_paid: number }[];
  sold_out: { name: string }[];
};

export async function getAnalyticsSummary(supabase: GxkSupabaseClient, from: Date, to: Date): Promise<AnalyticsSummary> {
  const { data, error } = await supabase.rpc("admin_analytics_summary", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw error;
  return data as unknown as AnalyticsSummary;
}

/** Conversión: sesiones que terminaron en pedido / sesiones con actividad. */
export function conversionRate(summary: Pick<AnalyticsSummary, "sessions" | "sessions_with_order">): number {
  return summary.sessions > 0 ? summary.sessions_with_order / summary.sessions : 0;
}

