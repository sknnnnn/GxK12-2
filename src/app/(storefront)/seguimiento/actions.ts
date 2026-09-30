"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lookupOrderForTracking, type OrderStatusView } from "@/services/orders";

export type TrackingLookupState = { status: "idle" } | { status: "not_found" } | { status: "found"; order: OrderStatusView };

/** Tracking público por número de pedido + email (Bible §33). */
export async function trackOrderAction(_prev: TrackingLookupState, formData: FormData): Promise<TrackingLookupState> {
  const orderNumber = String(formData.get("pedido") ?? "").slice(0, 40);
  const email = String(formData.get("email") ?? "").slice(0, 200);
  const order = await lookupOrderForTracking(createSupabaseAdminClient(), orderNumber, email);
  return order ? { status: "found", order } : { status: "not_found" };
}
