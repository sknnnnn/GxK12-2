// Checkout: revalidación completa previa a la creación del pedido (precio, stock, variante activa) y reserva de stock.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// Excepción deliberada: la creación real del pedido llama a la función SQL
// create_order_with_reservation (supabase/migrations/...), que solo
// service_role puede ejecutar. Quien invoque este servicio con fines de
// checkout real debe pasar un cliente construido con
// createSupabaseAdminClient (server-only, nunca en Desktop ni en el
// navegador) — no un cliente de sesión de usuario.
export {};
