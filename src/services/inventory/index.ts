// Inventory: gestión de stock por variante, reserva/liberación y alertas de stock bajo (≤ 3 unidades).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// La regla de "evitar overselling" vive en la función SQL
// create_order_with_reservation (descuento atómico condicional
// stock >= qty), no debe reimplementarse en TypeScript ni duplicarse por
// interfaz: Admin Web y Desktop consultan el mismo stock real, sin lógica
// de disponibilidad propia de cada uno.
export {};
