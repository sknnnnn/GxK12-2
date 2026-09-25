import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase privilegiado (service role): ignora RLS.
 *
 * Server-only. Nunca debe importarse desde código de cliente ni exponerse
 * al navegador. Esto vale también para la futura app de escritorio: Desktop
 * NUNCA debe empaquetar la service-role key ni ejecutar este cliente
 * localmente — el guard `server-only` solo protege contra el bundler de
 * Next.js, no contra un empaquetado de Tauri/Node, así que la disciplina de
 * "esto corre solo en un servidor real" hay que sostenerla también al
 * incorporar Desktop (ver ARCHITECTURE.md § Seguridad).
 *
 * Reservado para operaciones administrativas server-side de alcance acotado
 * (ej. checkout vía create_order_with_reservation, webhooks de pago,
 * liberación de reservas vencidas) — no para servir de backend general del
 * panel admin, que debe operar con la sesión del propio administrador
 * (createSupabaseServerClient) y quedar sujeto a RLS.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
