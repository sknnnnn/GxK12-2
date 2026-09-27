"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/services/admin";

export type LoginState = { error: string } | null;

/**
 * Login de Admin Web contra Supabase Auth. No alcanza con que
 * signInWithPassword funcione: si la cuenta no tiene fila activa en
 * `admins`, se cierra la sesión recién creada en el mismo request -- nunca
 * queda un usuario "autenticado pero no admin" con cookies de sesión
 * puestas (ver services/admin.getCurrentAdmin).
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresá tu email y tu contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { error: "Email o contraseña incorrectos." };
  }

  const admin = await getCurrentAdmin(supabase);
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel administrativo." };
  }

  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
