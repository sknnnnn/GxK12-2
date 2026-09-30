"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  addMemberAddress,
  addMemberFavorite,
  createMemberProfile,
  deleteMemberAddress,
  getCurrentMember,
  getMemberFavoriteIds,
  markNotificationsRead,
  parseMemberAddressInput,
  parseMemberProfileInput,
  removeMemberFavorite,
  setDefaultMemberAddress,
  updateMemberProfile,
} from "@/services/familia";

export type FormState = { error?: string; message?: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}

function confirmUrl(next: string): string {
  return `${siteUrl()}/familia/confirmar?next=${encodeURIComponent(next)}`;
}

// ----------------------------------------------------------------------------
// Registro opcional, ingreso y contraseña (Supabase Auth)
// ----------------------------------------------------------------------------

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = parseMemberProfileInput(formData);
  if (!profile.ok) return { error: profile.error };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_PATTERN.test(email)) return { error: "El email no es válido." };
  if (!password) return { error: "Elegí una contraseña." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmUrl("/familia") },
  });
  if (error) return { error: error.message.includes("assword") ? "La contraseña no cumple los requisitos mínimos." : "No pudimos registrarte. Volvé a intentar." };

  // Sin identidades = el email ya tenía cuenta (Supabase no lo revela). No se
  // crea nada nuevo y se responde igual que un alta normal.
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    await createMemberProfile(createSupabaseAdminClient(), data.user.id, profile.value);
  }
  if (data.session) redirect("/familia");
  return { message: "Te enviamos un email para confirmar tu cuenta. Confirmala y ya sos parte de la Familia 🐾" };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ingresá tu email y tu contraseña." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.code === "email_not_confirmed" ? "Todavía no confirmaste tu email." : "Email o contraseña incorrectos." };
  }
  redirect("/familia");
}

/** Cuenta ya existente (con email confirmado) que todavía no es parte de la Familia. */
export async function joinFamiliaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = parseMemberProfileInput(formData);
  if (!profile.ok) return { error: profile.error };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return { error: "Confirmá tu email para sumarte." };
  await createMemberProfile(createSupabaseAdminClient(), user.id, profile.value);
  redirect("/familia");
}

export async function requestRecoveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) return { error: "El email no es válido." };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmUrl("/familia/nueva-clave") });
  return { message: "Si el email tiene cuenta, te llegó un link para elegir una contraseña nueva." };
}

export async function newPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Elegí una contraseña." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No pudimos cambiar la contraseña. Pedí un link nuevo." };
  redirect("/familia");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/familia");
}

// ----------------------------------------------------------------------------
// MI CASA
// ----------------------------------------------------------------------------

async function memberSession() {
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember(supabase);
  if (!member) redirect("/familia");
  return { supabase, member };
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, member } = await memberSession();
  const profile = parseMemberProfileInput(formData);
  if (!profile.ok) return { error: profile.error };
  await updateMemberProfile(supabase, member.userId, profile.value);
  revalidatePath("/familia", "layout");
  return { message: "Datos guardados." };
}

export async function addAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, member } = await memberSession();
  const address = parseMemberAddressInput(formData);
  if (!address.ok) return { error: address.error };
  await addMemberAddress(supabase, member.userId, address.value);
  revalidatePath("/familia/direcciones");
  return { message: "Dirección guardada." };
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const { supabase } = await memberSession();
  await deleteMemberAddress(supabase, addressId);
  revalidatePath("/familia/direcciones");
}

export async function setDefaultAddressAction(addressId: string): Promise<void> {
  const { supabase } = await memberSession();
  await setDefaultMemberAddress(supabase, addressId);
  revalidatePath("/familia/direcciones");
}

export async function markNotificationsReadAction(): Promise<void> {
  const { supabase } = await memberSession();
  await markNotificationsRead(supabase);
  revalidatePath("/familia", "layout");
}

// Favoritos sincronizados (syncAdapter de FavoritesProvider).
const UUID = /^[0-9a-f-]{36}$/i;

export async function loadFavoritesAction(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!(await getCurrentMember(supabase))) return [];
  return getMemberFavoriteIds(supabase);
}

export async function addFavoriteAction(productId: string): Promise<void> {
  if (!UUID.test(productId)) return;
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember(supabase);
  if (member) await addMemberFavorite(supabase, member.userId, productId);
}

export async function removeFavoriteAction(productId: string): Promise<void> {
  if (!UUID.test(productId)) return;
  const supabase = await createSupabaseServerClient();
  if (await getCurrentMember(supabase)) await removeMemberFavorite(supabase, productId);
}
