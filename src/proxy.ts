import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

// Chequeo OPTIMISTA de acceso a /admin: solo mira si hay una sesión de
// Supabase Auth válida, no si el usuario es admin activo (esa verificación
// real vive en src/app/admin/(protected)/layout.tsx, gateada por RLS --
// ver el comentario de updateSupabaseSession). Esto solo evita que alguien
// sin sesión llegue siquiera a pedir el layout protegido.
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX) && pathname !== ADMIN_LOGIN_PATH;

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
