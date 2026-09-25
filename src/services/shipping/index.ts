// Shipping: cotización, creación de envío, etiqueta y tracking vía ShippingProvider.
// Proveedores iniciales: Andreani y Correo Argentino (pendientes de integrar, ver ./provider.ts).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
export {};
