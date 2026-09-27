import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase Auth en cada request y propaga las
 * cookies actualizadas. Requerido por @supabase/ssr en Next.js App Router.
 *
 * También devuelve el usuario autenticado (si hay uno) para que src/proxy.ts
 * pueda hacer el chequeo OPTIMISTA de acceso a /admin -- si hay sesión o no,
 * nada más. Es deliberadamente optimista y no una autorización real: Next.js
 * desaconseja consultar la base de datos en Proxy (corre en cada request,
 * incluso prefetches). La verificación real de "es admin activo" vive en
 * src/app/admin/(protected)/layout.tsx vía services/admin.getCurrentAdmin,
 * que sí corre server-side gateado por RLS -- esa es la barrera que importa,
 * esto es solo para no dejar pasar a un usuario ni siquiera autenticado.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin proyecto Supabase configurado todavía (bootstrap): no bloquear la app.
  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
