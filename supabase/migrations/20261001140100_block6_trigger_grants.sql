-- Bloque 6: las funciones trigger no se exponen como RPC (advisor de Supabase).
revoke all on function notify_member_order_status() from public, anon, authenticated;
revoke all on function sync_order_camino_reward() from public, anon, authenticated;
