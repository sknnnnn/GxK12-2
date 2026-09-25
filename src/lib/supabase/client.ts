import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el navegador (operaciones públicas).
 * Usa la anon key: queda sujeto a las políticas RLS de acceso público.
 */
export function createSupabasePublicClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
