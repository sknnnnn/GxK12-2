import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseClientAnalyticsEvent, recordAnalyticsEvents } from "@/services/analytics";

// Recepción de eventos de analytics del Storefront (Bible §36). Nunca rompe
// la navegación: cualquier problema responde 204 igual.
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const list = Array.isArray(body) ? body.slice(0, 20) : [body];
    const events = list.map(parseClientAnalyticsEvent).filter((event) => event !== null);
    await recordAnalyticsEvents(createSupabaseAdminClient(), events);
  } catch (error) {
    console.error("[analytics] evento descartado:", error instanceof Error ? error.message : error);
  }
  return new NextResponse(null, { status: 204 });
}
