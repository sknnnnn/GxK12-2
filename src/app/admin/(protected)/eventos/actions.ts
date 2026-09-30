"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_STATUSES, deleteRow, EVENT_KINDS, removeContentImage, saveEvent, type EventInput } from "@/services/admin";
import { slugify } from "@/lib/slug";
import { localInputToIso } from "@/lib/datetime";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function parseEvent(formData: FormData): { ok: true; input: EventInput } | { ok: false; error: string } {
  const title = text(formData, "title");
  const kind = text(formData, "kind");
  const status = text(formData, "status");
  const startsAt = localInputToIso(text(formData, "startsAt"));
  const endsAt = localInputToIso(text(formData, "endsAt"));
  if (!title) return { ok: false, error: "El evento necesita un título." };
  if (!(EVENT_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Tipo inválido." };
  if (!(CONTENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Estado inválido." };
  if (!startsAt) return { ok: false, error: "Indicá fecha y hora de inicio." };
  if (endsAt && endsAt < startsAt) return { ok: false, error: "El fin debe ser posterior al inicio." };
  return {
    ok: true,
    input: {
      kind: kind as EventInput["kind"],
      title,
      slug: slugify(text(formData, "slug") || title),
      startsAt,
      endsAt,
      place: text(formData, "place") || null,
      schedule: text(formData, "schedule") || null,
      description: text(formData, "description") || null,
      participation: text(formData, "participation") || null,
      status: status as EventInput["status"],
      membersOnly: formData.get("membersOnly") === "on",
    },
  };
}

function errorOf(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  return message.includes("duplicate key") ? "Ya existe un evento con ese slug." : "No se pudo guardar. Revisá los datos.";
}

export async function saveEventAction(id: string | null, formData: FormData): Promise<void> {
  const back = id ? `/admin/eventos/${id}` : "/admin/eventos";
  const parsed = parseEvent(formData);
  if (!parsed.ok) redirect(`${back}?error=${encodeURIComponent(parsed.error)}`);
  let savedId: string;
  try {
    savedId = await saveEvent(await createSupabaseServerClient(), id, parsed.input);
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(errorOf(error))}`);
  }
  redirect(`/admin/eventos/${savedId}?success=1`);
}

export async function deleteEventAction(id: string, coverPath: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await deleteRow(supabase, "events", id);
  await removeContentImage(supabase, coverPath);
  redirect("/admin/eventos?success=1");
}
