// Admin — Familia GxK (Roadmap Bloque 6): configuración del Camino G & K,
// comunicaciones a miembros y resumen de la Familia. Sesión del admin: RLS
// y las funciones SQL validan is_active_admin().

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { STATION_10_MAX_PERCENT, type CaminoSettingsView } from "@/lib/familia/camino";

export function parseCaminoSettingsInput(formData: FormData): { ok: true; value: CaminoSettingsView } | { ok: false; error: string } {
  const percentRaw = String(formData.get("station10Percent") ?? "").trim();
  const capRaw = String(formData.get("maxDiscountAmount") ?? "").trim();
  const station10Percent = percentRaw ? Number(percentRaw) : null;
  const maxDiscountAmount = capRaw ? Number(capRaw) : null;
  if (station10Percent !== null && (!Number.isFinite(station10Percent) || station10Percent <= 0 || station10Percent > STATION_10_MAX_PERCENT)) {
    return { ok: false, error: `El beneficio de la estación 10 va de más de 0 hasta ${STATION_10_MAX_PERCENT}%.` };
  }
  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
    return { ok: false, error: "El tope por beneficio debe ser mayor a 0." };
  }
  return {
    ok: true,
    value: {
      rewardsEnabled: formData.get("rewardsEnabled") === "on",
      station10Percent,
      maxDiscountAmount,
      conditions: String(formData.get("conditions") ?? "").trim().slice(0, 4000) || null,
    },
  };
}

export async function updateCaminoSettings(supabase: GxkSupabaseClient, input: CaminoSettingsView): Promise<{ ok: boolean }> {
  const { data, error } = await supabase
    .from("camino_settings")
    .update({
      rewards_enabled: input.rewardsEnabled,
      station10_percent: input.station10Percent,
      max_discount_amount: input.maxDiscountAmount,
      conditions: input.conditions,
    })
    .eq("id", true)
    .select("id");
  if (error) throw error;
  return { ok: (data ?? []).length > 0 };
}

export async function broadcastToMembers(
  supabase: GxkSupabaseClient,
  input: { title: string; body: string | null; link: string | null },
): Promise<number> {
  const { data, error } = await supabase.rpc("admin_broadcast_notification", {
    p_title: input.title,
    p_body: input.body,
    p_link: input.link,
  });
  if (error) throw error;
  return data ?? 0;
}

export type AdminFamiliaOverview = {
  members: number;
  rewards: { available: number; used: number };
  recent: { name: string; createdAt: string }[];
};

export async function getFamiliaOverview(supabase: GxkSupabaseClient): Promise<AdminFamiliaOverview> {
  const [membersRes, recentRes, rewardsRes] = await Promise.all([
    supabase.from("member_profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("member_profiles").select("first_name, last_name, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("camino_rewards").select("status"),
  ]);
  if (membersRes.error) throw membersRes.error;
  if (recentRes.error) throw recentRes.error;
  if (rewardsRes.error) throw rewardsRes.error;
  const rewards = rewardsRes.data ?? [];
  return {
    members: membersRes.count ?? 0,
    rewards: {
      available: rewards.filter((row) => row.status === "available").length,
      used: rewards.filter((row) => row.status === "used").length,
    },
    recent: (recentRes.data ?? []).map((row) => ({ name: `${row.first_name} ${row.last_name}`.trim(), createdAt: row.created_at })),
  };
}
