// Modalidades de entrega (Bible §19): Andreani, Correo Argentino y Punto de
// encuentro. Cuáles se ofrecen y a qué costo lo define el admin
// (delivery_methods). El checkout solo ofrece las habilitadas con costo.
//
// Convención de GXK Core: recibe un GxkSupabaseClient ya construido.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { ShippingProviderId } from "./provider";

export const DELIVERY_METHOD_IDS = ["andreani", "correo_argentino", "meeting_point"] as const;
export type DeliveryMethodId = (typeof DELIVERY_METHOD_IDS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethodId, string> = {
  andreani: "Andreani",
  correo_argentino: "Correo Argentino",
  meeting_point: "Punto de encuentro",
};

export function isDeliveryMethodId(value: unknown): value is DeliveryMethodId {
  return typeof value === "string" && (DELIVERY_METHOD_IDS as readonly string[]).includes(value);
}

/** Andreani y Correo Argentino despachan a domicilio; el punto de encuentro no. */
export function isCarrier(id: DeliveryMethodId): id is ShippingProviderId {
  return id === "andreani" || id === "correo_argentino";
}

export type DeliveryMethod = {
  id: DeliveryMethodId;
  label: string;
  isEnabled: boolean;
  cost: number | null;
  details: string | null;
};

export async function getDeliveryMethods(supabase: GxkSupabaseClient): Promise<DeliveryMethod[]> {
  const { data, error } = await supabase
    .from("delivery_methods")
    .select("id, is_enabled, cost, details, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isDeliveryMethodId(row.id))
    .map((row) => ({
      id: row.id as DeliveryMethodId,
      label: DELIVERY_METHOD_LABELS[row.id as DeliveryMethodId],
      isEnabled: row.is_enabled,
      cost: row.cost === null ? null : Number(row.cost),
      details: row.details?.trim() || null,
    }));
}

/** Lo que el checkout puede ofrecer: habilitado y con costo definido. */
export function availableDeliveryMethods(methods: DeliveryMethod[]): (DeliveryMethod & { cost: number })[] {
  return methods.filter((m): m is DeliveryMethod & { cost: number } => m.isEnabled && m.cost !== null && m.cost >= 0);
}

// ----------------------------------------------------------------------------
// Edición desde Admin
// ----------------------------------------------------------------------------

export type DeliveryMethodInput = { isEnabled: boolean; cost: string; details: string };

const COST_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export function parseDeliveryMethodInput(
  input: DeliveryMethodInput,
): { ok: true; value: { isEnabled: boolean; cost: number | null; details: string | null } } | { ok: false; error: string } {
  const costText = input.cost.trim().replace(",", ".");
  let cost: number | null = null;
  if (costText) {
    if (!COST_PATTERN.test(costText)) return { ok: false, error: "El costo debe ser un número mayor o igual a 0, con hasta 2 decimales." };
    cost = Number(costText);
  }
  if (input.isEnabled && cost === null) return { ok: false, error: "Para habilitar una modalidad hace falta definir su costo (puede ser 0)." };
  const details = input.details.trim();
  if (details.length > 1000) return { ok: false, error: "El detalle es demasiado largo." };
  return { ok: true, value: { isEnabled: input.isEnabled, cost, details: details || null } };
}

export async function updateDeliveryMethod(
  supabase: GxkSupabaseClient,
  id: DeliveryMethodId,
  value: { isEnabled: boolean; cost: number | null; details: string | null },
): Promise<{ ok: true } | { ok: false; reason: "not_allowed" }> {
  const { data, error } = await supabase
    .from("delivery_methods")
    .update({ is_enabled: value.isEnabled, cost: value.cost, details: value.details })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  return { ok: true };
}
