import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, type Member } from "@/services/familia";

/** Páginas de MI CASA: sin miembro con sesión, se vuelve al ingreso de Familia. */
export async function requireMember(): Promise<{ supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; member: Member }> {
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember(supabase);
  if (!member) redirect("/familia");
  return { supabase, member };
}

/** Rutas internas de Familia a las que puede volver un link de email. */
export function safeFamiliaPath(value: string | null | undefined): string {
  return typeof value === "string" && /^\/familia(\/[a-z0-9-]*)*$/.test(value) ? value : "/familia";
}
