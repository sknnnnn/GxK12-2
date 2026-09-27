-- ============================================================================
-- GXK12.2 — Soporte de pagos (Mercado Pago): estados reales + permisos
--
-- Amplía payments.status para reflejar 1:1 los estados que devuelve la API
-- real de Mercado Pago (antes solo cubría un subconjunto elegido antes de
-- integrar el proveedor real), otorga a service_role los privilegios que
-- record_payment_result necesita (no tenía ninguno sobre payments, a
-- propósito, hasta que existiera una función que la escribiera -- ver
-- migración de checkout), y agrega record_payment_result: aplica de forma
-- atómica el resultado de un pago ya verificado (webhook + consulta
-- server-side a la API de MP) sin dejar estados intermedios ante ningún
-- fallo.
-- ============================================================================

alter table payments drop constraint payments_status_check;
alter table payments add constraint payments_status_check
  check (status in (
    'pending', 'authorized', 'in_process', 'in_mediation',
    'approved', 'rejected', 'cancelled', 'refunded', 'charged_back'
  ));

comment on constraint payments_status_check on payments is
  'Refleja 1:1 los valores de status que devuelve la API de Mercado Pago (GET /v1/payments/{id}), no un subconjunto propio.';

-- ----------------------------------------------------------------------------
-- service_role necesita escribir en payments: record_payment_result hace un
-- upsert (INSERT ... ON CONFLICT DO UPDATE, exige INSERT + UPDATE; el
-- RETURNING exige además SELECT). No se otorga DELETE: la función nunca
-- borra pagos.
-- ----------------------------------------------------------------------------
grant select, insert, update on payments to service_role;

-- ============================================================================
-- record_payment_result: aplica el resultado YA VERIFICADO de un pago.
--
-- "Ya verificado" significa: firma del webhook validada (HMAC contra
-- MERCADO_PAGO_WEBHOOK_SECRET) y datos obtenidos con un GET /v1/payments/{id}
-- real contra la API de Mercado Pago -- nunca el payload crudo del webhook,
-- que solo indica "hay novedades", no el estado real. Ver services/payments.
--
-- Idempotente por diseño: reintentos del webhook (Mercado Pago reintenta
-- notificaciones no confirmadas) resuelven al mismo upsert por
-- (provider, external_id) sin duplicar filas ni relanzar la transición de
-- orders.status si ya se aplicó.
-- ============================================================================
create or replace function record_payment_result(
  p_order_number text,
  p_provider text,
  p_external_id text,
  p_status text,
  p_amount numeric,
  p_currency text,
  p_raw_reference jsonb
)
returns payments
language plpgsql
as $$
declare
  v_order record;
  v_payment payments;
begin
  select id, status into v_order
    from orders
   where order_number = p_order_number
   for update;

  if v_order is null then
    raise exception 'order_not_found: %', p_order_number;
  end if;

  insert into payments (
    order_id, provider, external_id, status, amount, currency, raw_reference
  ) values (
    v_order.id, p_provider, p_external_id, p_status, p_amount, p_currency, p_raw_reference
  )
  on conflict (provider, external_id) do update
    set status = excluded.status,
        amount = excluded.amount,
        currency = excluded.currency,
        raw_reference = excluded.raw_reference,
        updated_at = now()
  returning * into v_payment;

  -- Un pago aprobado confirma el pedido -- pero solo si todavía estaba
  -- esperando pago (idempotente: una segunda notificación "approved" para
  -- el mismo pago, o un pedido ya confirmado por otra vía, no lo toca).
  if p_status = 'approved' and v_order.status = 'pending_payment' then
    update orders set status = 'payment_confirmed' where id = v_order.id;
  -- Reembolso/contracargo después de confirmado: mueve el pedido a
  -- refunded. Antes de estar confirmado no aplica (nada que reembolsar).
  elsif p_status in ('refunded', 'charged_back') and v_order.status = 'payment_confirmed' then
    update orders set status = 'refunded' where id = v_order.id;
  end if;

  return v_payment;
end;
$$;

comment on function record_payment_result is
  'Aplica atómicamente el resultado de un pago ya verificado (firma de webhook validada + GET /v1/payments/{id} contra la API real de Mercado Pago): upsert en payments por (provider, external_id) y transición condicional de orders.status. Solo debe invocarse server-side (service-role) con datos ya verificados, nunca con el payload crudo del webhook.';

-- Función de negocio sensible: mismo criterio que create_order_with_reservation
-- (ver migración inicial) -- sin este REVOKE, anon/authenticated podrían
-- invocarla vía supabase.rpc() y falsificar el estado de cualquier pedido.
revoke all on function record_payment_result from public;
grant execute on function record_payment_result to service_role;
