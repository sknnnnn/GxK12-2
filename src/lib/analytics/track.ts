// Tracking del Storefront (Bible §36). Solo navegador. Identifica la visita
// con un id de sesión anónimo (sessionStorage): no guarda datos personales.

const SESSION_KEY = "gxk-analytics-session";

export type TrackData = {
  productId?: string;
  outfitId?: string;
  entryId?: string;
  query?: string;
  quantity?: number;
  path?: string;
};

export function analyticsSessionId(): string | null {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(event: string, data: TrackData = {}): void {
  if (typeof window === "undefined") return;
  const sessionId = analyticsSessionId();
  if (!sessionId) return;
  const body = JSON.stringify({ event, sessionId, path: window.location.pathname, ...data });
  try {
    if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/analytics", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // Analytics nunca interrumpe la navegación.
  }
}
