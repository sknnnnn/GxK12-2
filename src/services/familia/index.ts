// Familia GxK (Bible §23-§25; Roadmap Bloque 6). Registro opcional: comprar
// no requiere cuenta. Un miembro es un usuario de Supabase Auth con email
// confirmado y fila en member_profiles.
//
// Convención de GXK Core: cada función recibe un GxkSupabaseClient.
// - Cliente de SESIÓN (createSupabaseServerClient): perfil, direcciones,
//   favoritos y notificaciones propias -- RLS limita todo al miembro.
// - Cliente ADMIN (server-only): pedidos vinculados por email y el Camino
//   (sus funciones SQL solo las ejecuta service_role). Quien llama ya
//   resolvió el miembro con la sesión; nunca se usa con datos del navegador.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import { caminoPosition, isRewardUsable, rewardPercent, type CaminoPosition, type CaminoSettingsView } from "@/lib/familia/camino";

export type Member = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

/** Miembro con sesión, o null (sin sesión, email sin confirmar o sin perfil de Familia). */
export async function getCurrentMember(supabase: GxkSupabaseClient): Promise<Member | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  const { data, error } = await supabase
    .from("member_profiles")
    .select("first_name, last_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { userId: user.id, email: user.email.toLowerCase(), firstName: data.first_name, lastName: data.last_name, phone: data.phone };
}

export type MemberProfileInput = { firstName: string; lastName: string; phone: string };

export function parseMemberProfileInput(formData: FormData): { ok: true; value: MemberProfileInput } | { ok: false; error: string } {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!firstName || !lastName) return { ok: false, error: "Completá nombre y apellido." };
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 40) return { ok: false, error: "Algún dato es demasiado largo." };
  return { ok: true, value: { firstName, lastName, phone } };
}

/** Alta del perfil al registrarse (cliente admin: el usuario todavía puede no tener sesión). */
export async function createMemberProfile(admin: GxkSupabaseClient, userId: string, input: MemberProfileInput): Promise<void> {
  const { error } = await admin
    .from("member_profiles")
    .upsert({ user_id: userId, first_name: input.firstName, last_name: input.lastName, phone: input.phone }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function updateMemberProfile(supabase: GxkSupabaseClient, userId: string, input: MemberProfileInput): Promise<void> {
  const { error } = await supabase
    .from("member_profiles")
    .update({ first_name: input.firstName, last_name: input.lastName, phone: input.phone })
    .eq("user_id", userId);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Direcciones (misma forma que pide el checkout para transportistas)
// ----------------------------------------------------------------------------

export type MemberAddress = {
  id: string;
  label: string;
  streetName: string;
  streetNumber: string;
  floor: string;
  apartment: string;
  locality: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

export async function getMemberAddresses(supabase: GxkSupabaseClient): Promise<MemberAddress[]> {
  const { data, error } = await supabase
    .from("member_addresses")
    .select("id, label, street_name, street_number, floor, apartment, locality, province, postal_code, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    streetName: row.street_name,
    streetNumber: row.street_number,
    floor: row.floor,
    apartment: row.apartment,
    locality: row.locality,
    province: row.province,
    postalCode: row.postal_code,
    isDefault: row.is_default,
  }));
}

export type MemberAddressInput = Omit<MemberAddress, "id" | "isDefault">;

export function parseMemberAddressInput(formData: FormData): { ok: true; value: MemberAddressInput } | { ok: false; error: string } {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const value: MemberAddressInput = {
    label: read("label"),
    streetName: read("streetName"),
    streetNumber: read("streetNumber"),
    floor: read("floor"),
    apartment: read("apartment"),
    locality: read("locality"),
    province: read("province"),
    postalCode: read("postalCode"),
  };
  if (!value.streetName || !value.streetNumber || !value.locality || !value.province || !value.postalCode) {
    return { ok: false, error: "Completá calle, número, localidad, provincia y código postal." };
  }
  if (Object.values(value).some((field) => field.length > 120)) return { ok: false, error: "Algún dato es demasiado largo." };
  return { ok: true, value };
}

export async function addMemberAddress(supabase: GxkSupabaseClient, userId: string, input: MemberAddressInput): Promise<void> {
  const { count, error: countError } = await supabase.from("member_addresses").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  const { error } = await supabase.from("member_addresses").insert({
    user_id: userId,
    label: input.label,
    street_name: input.streetName,
    street_number: input.streetNumber,
    floor: input.floor,
    apartment: input.apartment,
    locality: input.locality,
    province: input.province,
    postal_code: input.postalCode,
    is_default: (count ?? 0) === 0,
  });
  if (error) throw error;
}

export async function deleteMemberAddress(supabase: GxkSupabaseClient, addressId: string): Promise<void> {
  const { error } = await supabase.from("member_addresses").delete().eq("id", addressId);
  if (error) throw error;
}

export async function setDefaultMemberAddress(supabase: GxkSupabaseClient, addressId: string): Promise<void> {
  const { error: resetError } = await supabase.from("member_addresses").update({ is_default: false }).neq("id", addressId);
  if (resetError) throw resetError;
  const { error } = await supabase.from("member_addresses").update({ is_default: true }).eq("id", addressId);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Favoritos sincronizados con la cuenta
// ----------------------------------------------------------------------------

export async function getMemberFavoriteIds(supabase: GxkSupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("member_favorites").select("product_id").order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

export async function addMemberFavorite(supabase: GxkSupabaseClient, userId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from("member_favorites")
    .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeMemberFavorite(supabase: GxkSupabaseClient, productId: string): Promise<void> {
  const { error } = await supabase.from("member_favorites").delete().eq("product_id", productId);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Mis pedidos (cliente admin, filtrado por el email del miembro)
// ----------------------------------------------------------------------------

export type MemberOrderSummary = {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

export async function getMemberOrders(admin: GxkSupabaseClient, email: string): Promise<MemberOrderSummary[]> {
  const { data, error } = await admin
    .from("orders")
    .select("order_number, status, total, created_at, customers!inner ( email )")
    .eq("customers.email", email.toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    orderNumber: row.order_number,
    status: row.status,
    total: Number(row.total),
    createdAt: row.created_at,
  }));
}

// ----------------------------------------------------------------------------
// Camino G & K
// ----------------------------------------------------------------------------

export type CaminoReward = {
  id: string;
  cycle: number;
  station: number;
  status: "available" | "used" | "void";
  percent: number | null;
  usable: boolean;
  orderId: string | null;
};

export type CaminoView = {
  confirmedPurchases: number;
  position: CaminoPosition;
  settings: CaminoSettingsView;
  rewards: CaminoReward[];
};

export async function getCaminoSettings(supabase: GxkSupabaseClient): Promise<CaminoSettingsView> {
  const { data, error } = await supabase
    .from("camino_settings")
    .select("rewards_enabled, station10_percent, max_discount_amount, conditions")
    .maybeSingle();
  if (error) throw error;
  return {
    rewardsEnabled: data?.rewards_enabled ?? false,
    station10Percent: data?.station10_percent === null || data?.station10_percent === undefined ? null : Number(data.station10_percent),
    maxDiscountAmount: data?.max_discount_amount === null || data?.max_discount_amount === undefined ? null : Number(data.max_discount_amount),
    conditions: data?.conditions ?? null,
  };
}

/** Sincroniza (idempotente) las estaciones alcanzadas y devuelve el Camino del miembro. */
export async function getCamino(admin: GxkSupabaseClient, userId: string): Promise<CaminoView> {
  const { data: count, error: syncError } = await admin.rpc("sync_camino_rewards", { p_user_id: userId });
  if (syncError) throw syncError;
  const [settings, rewardsRes] = await Promise.all([
    getCaminoSettings(admin),
    admin
      .from("camino_rewards")
      .select("id, cycle, station, status, percent, order_id")
      .eq("user_id", userId)
      .neq("status", "void")
      .order("cycle")
      .order("station"),
  ]);
  if (rewardsRes.error) throw rewardsRes.error;
  return {
    confirmedPurchases: count ?? 0,
    position: caminoPosition(count ?? 0),
    settings,
    rewards: (rewardsRes.data ?? []).map((row) => ({
      id: row.id,
      cycle: row.cycle,
      station: row.station,
      status: row.status as CaminoReward["status"],
      percent: row.percent === null ? rewardPercent(row.station, settings) : Number(row.percent),
      usable: row.status === "available" && isRewardUsable(row.station, settings),
      orderId: row.order_id,
    })),
  };
}

// ----------------------------------------------------------------------------
// Notificaciones
// ----------------------------------------------------------------------------

export type MemberNotification = {
  id: string;
  kind: "order_status" | "camino" | "broadcast";
  payload: Record<string, unknown>;
  title: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export async function getMemberNotifications(supabase: GxkSupabaseClient, limit = 50): Promise<MemberNotification[]> {
  const { data, error } = await supabase
    .from("member_notifications")
    .select("id, kind, payload, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as MemberNotification["kind"],
    payload: (row.payload ?? {}) as Record<string, unknown>,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.read_at !== null,
    createdAt: row.created_at,
  }));
}

export async function countUnreadNotifications(supabase: GxkSupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("member_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationsRead(supabase: GxkSupabaseClient): Promise<void> {
  const { error } = await supabase.from("member_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Members Only (Bible §24): early access, contenido exclusivo, invitaciones
// ----------------------------------------------------------------------------

/** Productos en early access vigente (RLS: solo los ve un miembro). */
export async function getEarlyAccessProductIds(supabase: GxkSupabaseClient, now: Date = new Date()): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("status", "published")
    .gt("members_only_until", now.toISOString())
    .order("members_only_until");
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}
