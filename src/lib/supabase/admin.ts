import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase privilegiado (service role): ignora RLS.
 * Server-only. Nunca debe importarse desde código de cliente ni exponerse
 * al navegador. Reservado para operaciones administrativas server-side
 * (ej. checkout, webhooks, procesos internos).
 */
export function createSupabaseAdminClient() {
  return createClient(
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
