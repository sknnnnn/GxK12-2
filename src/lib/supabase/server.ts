import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers.
 * Usa la anon key con la sesión del usuario (cookies): respeta RLS según
 * quién está autenticado (público o administrador logueado vía Supabase Auth).
 *
 * Específico de Next.js (depende de next/headers). Es el único de los tres
 * factories de este directorio que no podría reutilizarse tal cual desde un
 * proceso no-Next.js (ej. Desktop) — ver ARCHITECTURE.md.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Se puede ignorar si setAll es invocado desde un Server Component:
            // hay middleware refrescando la sesión de todos modos.
          }
        },
      },
    },
  );
}
