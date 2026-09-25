// Payments: creación del pago, validación de webhook y actualización de estado.
// Proveedor inicial: Mercado Pago (pendiente de integrar).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md.
//
// El estado de `payments` solo debe cambiar a partir de un webhook validado
// (nunca por edición manual desde Admin Web o Desktop): la policy RLS
// admin_read_payments es de solo lectura a propósito, y solo service_role
// puede escribir. El handler del webhook usa createSupabaseAdminClient.
export {};
