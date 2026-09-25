// Admin: operaciones privilegiadas de gestión de catálogo, pedidos, envíos y outfits.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Admin Web o, más adelante,
// Desktop — ver ARCHITECTURE.md.
//
// Este es el módulo que Admin Web y Desktop comparten más directamente: la
// regla de negocio (qué puede editarse, qué queda solo-lectura, qué
// requiere confirmación) vive acá una sola vez, gateada por RLS a través
// del cliente de sesión del administrador (createSupabaseServerClient en
// Next.js; el equivalente autenticado que use Desktop). Ninguna de las dos
// interfaces debe reimplementar estas reglas por su cuenta.
export {};
