-- ============================================================================
-- GXK12.2 — Automatizar liberación de reservas vencidas (PRO-129)
--
-- release_expired_stock_reservations() ya existe (ver migración inicial):
-- ya es transaccional (recorre pedidos pending_payment vencidos con FOR
-- UPDATE SKIP LOCKED, repone stock desde order_items y cancela el pedido,
-- todo por pedido) y ya fue probada en la etapa de checkout. Esta migración
-- SOLO programa su ejecución periódica vía pg_cron -- no toca la función,
-- no reimplementa su lógica.
--
-- pg_cron está disponible en el proyecto (confirmado con
-- `select * from pg_available_extensions` antes de esta migración) pero no
-- estaba instalado todavía -- de ahí el `create extension if not exists`.
-- ============================================================================

create extension if not exists pg_cron;

-- cron.schedule(job_name, schedule, command) hace UPSERT por nombre de job
-- (pg_cron >= 1.4, este proyecto tiene 1.6.4): si el job ya existe se
-- actualiza su schedule/command en vez de duplicarlo. Por eso alcanza con
-- una sola llamada, incluso si esta migración se reaplica -- no hace falta
-- un unschedule previo.
select cron.schedule(
  'release-expired-stock-reservations',
  '*/5 * * * *',
  $$select release_expired_stock_reservations();$$
);
