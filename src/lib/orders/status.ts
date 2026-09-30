// Estados del pedido de cara al cliente (Bible §33):
//   Nuevo → Pago confirmado → Preparando → Despachado → Entregado
// Pura: la usan Storefront (tracking), Admin y los emails.

export const TRACKING_STEPS = ["pending_payment", "payment_confirmed", "preparing", "shipped", "delivered"] as const;
export type TrackingStep = (typeof TRACKING_STEPS)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Nuevo",
  payment_confirmed: "Pago confirmado",
  preparing: "Preparando",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  incidence: "Incidencia",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export type TrackingTimelineStep = { status: TrackingStep; label: string; reached: boolean; current: boolean; at: string | null };

/**
 * Línea de tiempo del pedido: los 5 pasos de la Bible, marcando hasta dónde
 * llegó y cuándo (según el historial de estados). Un pedido cancelado,
 * reembolsado o con incidencia muestra los pasos alcanzados antes de eso.
 */
export function buildTrackingTimeline(
  currentStatus: string,
  history: { status: string; at: string }[],
): TrackingTimelineStep[] {
  const reachedAt = new Map<string, string>();
  for (const entry of history) if (!reachedAt.has(entry.status)) reachedAt.set(entry.status, entry.at);
  const currentIndex = TRACKING_STEPS.indexOf(currentStatus as TrackingStep);
  const lastReached =
    currentIndex >= 0 ? currentIndex : Math.max(-1, ...TRACKING_STEPS.map((step, i) => (reachedAt.has(step) ? i : -1)));
  return TRACKING_STEPS.map((status, index) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    reached: index <= Math.max(lastReached, 0),
    current: index === currentIndex,
    at: reachedAt.get(status) ?? null,
  }));
}
