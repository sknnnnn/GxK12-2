"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track, type TrackData } from "@/lib/analytics/track";

/** Navegación: una vista por cambio de ruta. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
  return null;
}

/** Evento al mostrarse una página (vista de producto, entrada, búsqueda). */
export function TrackEvent({ event, data }: { event: string; data: TrackData }) {
  const key = JSON.stringify([event, data]);
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === key) return;
    sent.current = key;
    track(event, JSON.parse(key)[1] as TrackData);
  }, [event, key]);
  return null;
}
