import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Tipo de cliente Supabase compartido por todo GXK Core (src/services/**).
 *
 * Los tres factories de este directorio (client.ts, server.ts, admin.ts)
 * devuelven un cliente de esta forma, construido de maneras distintas según
 * el contexto (navegador, Server Component/Action de Next.js, proceso
 * server-only con service-role). La lógica de dominio en services/ recibe
 * siempre este tipo como parámetro — nunca construye su propio cliente ni
 * importa cookies()/Next.js internamente — para poder invocarse igual desde
 * el Storefront, el Admin Web o, en el futuro, una app de escritorio que
 * construya su propio cliente autenticado (ver ARCHITECTURE.md).
 */
export type GxkSupabaseClient = SupabaseClient<Database>;
