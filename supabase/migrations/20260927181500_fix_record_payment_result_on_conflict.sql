-- ============================================================================
-- GXK12.2 — Corrección: record_payment_result usaba ON CONFLICT (provider,
-- external_id), pero uq_payments_provider_external es un índice ÚNICO
-- PARCIAL ("where external_id is not null", ver migración inicial) -- para
-- que Postgres pueda inferir el índice de arbitraje del ON CONFLICT, el
-- predicado WHERE tiene que repetirse literalmente en la cláusula.
--
-- Hallazgo (prueba controlada con un payment sintético vía SQL editor, sin
-- llamar a la API real de Mercado Pago): el upsert fallaba con "42P10: there
-- is no unique or exclusion constraint matching the ON CONFLICT
-- specification". No afectaba nada más: la función nunca había sido
-- invocada desde el webhook real todavía.
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
  on conflict (provider, external_id) where external_id is not null do update
    set status = excluded.status,
        amount = excluded.amount,
        currency = excluded.currency,
        raw_reference = excluded.raw_reference,
        updated_at = now()
  returning * into v_payment;

  if p_status = 'approved' and v_order.status = 'pending_payment' then
    update orders set status = 'payment_confirmed' where id = v_order.id;
  elsif p_status in ('refunded', 'charged_back') and v_order.status = 'payment_confirmed' then
    update orders set status = 'refunded' where id = v_order.id;
  end if;

  return v_payment;
end;
$$;
