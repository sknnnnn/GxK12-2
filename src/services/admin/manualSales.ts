// Ventas por Instagram / WhatsApp / eventos / presencial: se descuentan
// manualmente desde Admin (Bible §17) con el mismo descuento atómico
// condicional que las ventas online (admin_record_manual_sale).

import type { GxkSupabaseClient } from "@/lib/supabase/types";

export const MANUAL_SALE_CHANNELS = ["instagram", "whatsapp", "evento", "presencial"] as const;
export type ManualSaleChannel = (typeof MANUAL_SALE_CHANNELS)[number];

export const MANUAL_SALE_CHANNEL_LABELS: Record<ManualSaleChannel, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  evento: "Evento",
  presencial: "Presencial",
};

export function isManualSaleChannel(value: unknown): value is ManualSaleChannel {
  return typeof value === "string" && (MANUAL_SALE_CHANNELS as readonly string[]).includes(value);
}

export type RecordManualSaleResult =
  | { ok: true; remainingStock: number }
  | { ok: false; reason: "insufficient_stock" | "not_allowed" | "invalid" };

export async function recordManualSale(
  supabase: GxkSupabaseClient,
  input: { variantId: string; quantity: number; channel: ManualSaleChannel; note: string | null },
): Promise<RecordManualSaleResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { ok: false, reason: "invalid" };
  const { data, error } = await supabase.rpc("admin_record_manual_sale", {
    p_variant_id: input.variantId,
    p_quantity: input.quantity,
    p_channel: input.channel,
    p_note: input.note,
  });
  if (error) {
    if (error.message?.includes("insufficient_stock")) return { ok: false, reason: "insufficient_stock" };
    if (error.message?.includes("not_allowed")) return { ok: false, reason: "not_allowed" };
    throw error;
  }
  return { ok: true, remainingStock: data };
}

export type ManualSaleRow = {
  id: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  channel: string;
  note: string | null;
  createdAt: string;
};

export async function getRecentManualSales(supabase: GxkSupabaseClient, limit = 20): Promise<ManualSaleRow[]> {
  const { data, error } = await supabase
    .from("manual_sales")
    .select("id, product_name, variant_label, quantity, channel, note, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    productName: row.product_name,
    variantLabel: row.variant_label,
    quantity: row.quantity,
    channel: row.channel,
    note: row.note,
    createdAt: row.created_at,
  }));
}
