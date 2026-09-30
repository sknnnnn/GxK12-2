// Members Only (Bible §24). "MEMBERS ONLY — 24H EARLY ACCESS": hasta
// products.members_only_until solo lo ven y compran miembros de la Familia;
// después pasa automáticamente a público (lo resuelve RLS en Supabase).

import { isPast } from "@/lib/datetime";

export const EARLY_ACCESS_LABEL = "MEMBERS ONLY — 24H EARLY ACCESS";
/** Duración del early access que define la Bible (24H). */
export const EARLY_ACCESS_HOURS = 24;

export function isEarlyAccess(membersOnlyUntil: string | null, now: Date = new Date()): boolean {
  return membersOnlyUntil !== null && !isPast(membersOnlyUntil, now);
}
