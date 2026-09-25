// Orders: creación y consulta de pedidos, snapshots históricos en order_items, consulta vía token seguro.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// La consulta pública de un pedido por token (lookup_token_hash) no debe
// resolverse contra `orders` vía el cliente de sesión del comprador (no
// existe tal sesión): hashear el token recibido y consultar con un cliente
// admin server-only, devolviendo solo el subconjunto de campos apropiado.
export {};
