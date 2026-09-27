import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/services/admin";
import { AdminShell } from "@/components/admin/AdminShell";

// Autorización REAL de Admin Web: corre server-side en cada request a
// cualquier ruta bajo este grupo (incluida navegación directa a una URL
// interna, ej. /admin/pedidos) -- no depende de que el usuario no encuentre
// el link. src/proxy.ts solo hace un chequeo optimista de sesión; esto es
// lo que de verdad valida "es admin activo" (getCurrentAdmin, gateado por
// RLS sobre `admins`).
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const admin = await getCurrentAdmin(supabase);

  if (!admin) {
    redirect("/admin/login");
  }

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
