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

export type AdminMemberMatch = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  emailConfirmed: boolean;
  /** Compras que cuentan para el Camino (incluye las hechas como invitado con ese email). */
  confirmedPurchases: number;
};

/** Búsqueda de miembros por email o nombre (solo lectura; la función valida que sea admin). */
export async function searchMembers(supabase: GxkSupabaseClient, query: string): Promise<AdminMemberMatch[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("admin_member_lookup", { p_query: query });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.email,
    name: `${row.first_name} ${row.last_name}`.trim(),
    phone: row.phone,
    createdAt: row.created_at,
    emailConfirmed: row.email_confirmed,
    confirmedPurchases: row.confirmed_purchases,
  }));
}

export type AdminMemberDetail = {
  orders: { id: string; orderNumber: string; createdAt: string; status: string; total: number }[];
  rewards: { id: string; cycle: number; station: number; status: string; percent: number | null; discountAmount: number | null; orderId: string | null }[];
};

/** Pedidos (por email, incluidos los hechos como invitado) y beneficios del Camino de un miembro. */
export async function getMemberDetail(supabase: GxkSupabaseClient, member: Pick<AdminMemberMatch, "userId" | "email">): Promise<AdminMemberDetail> {
  const [ordersRes, rewardsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, created_at, status, total, customers!inner ( email )")
      .ilike("customers.email", member.email.replace(/[\\%_]/g, (char) => `\\${char}`))
      .order("created_at", { ascending: false })
      .returns<{ id: string; order_number: string; created_at: string; status: string; total: number }[]>(),
    supabase
      .from("camino_rewards")
      .select("id, cycle, station, status, percent, discount_amount, order_id")
      .eq("user_id", member.userId)
      .order("cycle")
      .order("station"),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (rewardsRes.error) throw rewardsRes.error;
  return {
    orders: (ordersRes.data ?? []).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      createdAt: row.created_at,
      status: row.status,
      total: row.total,
    })),
    rewards: (rewardsRes.data ?? []).map((row) => ({
      id: row.id,
      cycle: row.cycle,
      station: row.station,
      status: row.status,
      percent: row.percent,
      discountAmount: row.discount_amount,
      orderId: row.order_id,
    })),
  };
}

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
