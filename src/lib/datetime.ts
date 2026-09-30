// Fechas de formularios de Admin. GXK opera en Argentina (UTC-3, sin horario
// de verano): un <input type="datetime-local"> se interpreta en esa zona,
// sin depender de la zona horaria del servidor.

const AR_OFFSET = "-03:00";
export const GXK_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "2026-10-01T20:00" (hora de Argentina) -> ISO UTC. Vacío o inválido -> null. */
export function localInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}:00${AR_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO -> valor para <input type="datetime-local"> en hora de Argentina. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

const displayFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: GXK_TIME_ZONE });
const dateOnlyFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: GXK_TIME_ZONE });
const timeFormatter = new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: GXK_TIME_ZONE });

export function formatDateTimeAR(iso: string): string {
  return displayFormatter.format(new Date(iso));
}

export function formatDateAR(iso: string): string {
  return dateOnlyFormatter.format(new Date(iso));
}

export function formatTimeAR(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** true si la fecha ya pasó (eventos: pasan a archivo después de su fecha, Bible §29). */
export function isPast(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() < now.getTime();
}
