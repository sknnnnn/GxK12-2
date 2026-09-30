-- ============================================================================
-- Bloque 3 — Carrito + Checkout + Pedidos (Roadmap). Fuente: Bible §17-§19,
-- §32-§33.
--
-- RECONCILIACIÓN DE STOCK (Roadmap Bloque 3, Bible §17):
--   "El carrito no reserva; gana el primer pago confirmado."
-- Antes: create_order_with_reservation descontaba stock al crear el pedido
-- (reserva de 20 minutos). Ahora:
--   * create_order solo VERIFICA disponibilidad al crear el pedido (no
--     descuenta ni bloquea nada: el carrito y el checkout no reservan).
--   * El stock se descuenta en confirm_order_payment, atómicamente y todo o
--     nada, cuando se confirma el primer pago (webhook de Mercado Pago o pago
--     en efectivo registrado por el admin). Las filas de variantes se
--     bloquean en orden (FOR UPDATE) solo durante esa transacción: es el
--     único punto técnico de exclusión y dura lo que dura la transacción.
--   * Si al confirmar un pago ya no hay stock (otro pago confirmado ganó), el
--     pedido pasa a 'incidence' con incidence_reason = 'stock_conflict' para
--     que el admin gestione la devolución. No hay descuento parcial.
--   * orders.stock_committed indica si el pedido tiene stock descontado:
--     hace reconciliable cualquier cancelación/reembolso (se repone solo lo
--     que efectivamente se descontó, incluidos pedidos anteriores a este
--     cambio, creados con la reserva vieja).
-- create_order_with_reservation se conserva sin cambios para no romper
-- despliegues anteriores; el código nuevo ya no la usa.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DELIVERY_METHODS (Bible §19: Andreani, Correo Argentino, Punto de encuentro)
-- ----------------------------------------------------------------------------
create table delivery_methods (
  id text primary key check (id in ('andreani', 'correo_argentino', 'meeting_point')),
  is_enabled boolean not null default false,
  -- NULL = sin costo configurado: el método no se ofrece aunque esté habilitado.
  cost numeric(12, 2) check (cost is null or cost >= 0),
  -- Punto de encuentro: lugar/horario/forma de coordinar, texto del admin.
  details text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger trg_delivery_methods_updated_at
  before update on delivery_methods
  for each row execute function set_updated_at();

insert into delivery_methods (id, sort_order) values
  ('andreani', 1),
  ('correo_argentino', 2),
  ('meeting_point', 3);

-- Continuidad con la configuración anterior (un proveedor activo + costo fijo).
update delivery_methods dm
   set is_enabled = true,
       cost = ss.shipping_cost
  from shipping_settings ss
 where ss.id and dm.id = ss.active_provider and ss.shipping_cost is not null;

comment on table delivery_methods is 'Modalidades de entrega ofrecidas en checkout (Bible §19). Configurables desde Admin.';

alter table delivery_methods enable row level security;

create policy "public_read_delivery_methods" on delivery_methods
  for select using (true);

create policy "admin_update_delivery_methods" on delivery_methods
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on delivery_methods to anon, authenticated, service_role;
grant update on delivery_methods to authenticated;

-- ----------------------------------------------------------------------------
-- PAYMENT_SETTINGS (fila única). Bible §18: Mercado Pago, efectivo, tarjetas,
-- cuotas cuando corresponda según Mercado Pago. Bible §19: punto de
-- encuentro con posibilidad de 50% reserva + 50% entrega.
-- Pendientes de definición (Roadmap): alcance exacto de "efectivo" y
-- configuración final de cuotas -> ambos quedan configurables y el efectivo
-- arranca deshabilitado.
-- ----------------------------------------------------------------------------
create table payment_settings (
  id boolean primary key default true check (id),
  mercado_pago_enabled boolean not null default true,
  -- NULL = las cuotas que ofrezca Mercado Pago para la cuenta.
  max_installments integer check (max_installments is null or max_installments between 1 and 24),
  cash_enabled boolean not null default false,
  meeting_point_deposit_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger trg_payment_settings_updated_at
  before update on payment_settings
  for each row execute function set_updated_at();

insert into payment_settings (id) values (true);

alter table payment_settings enable row level security;

create policy "public_read_payment_settings" on payment_settings
  for select using (true);

create policy "admin_update_payment_settings" on payment_settings
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on payment_settings to anon, authenticated, service_role;
grant update on payment_settings to authenticated;

-- ----------------------------------------------------------------------------
-- ORDERS: modalidad de pago, saldo, stock comprometido, incidencias.
-- orders.shipping_method pasa a guardar la modalidad de entrega elegida.
-- ----------------------------------------------------------------------------
alter table orders
  add column payment_method text not null default 'mercado_pago'
    check (payment_method in ('mercado_pago', 'cash')),
  add column payment_plan text not null default 'full'
    check (payment_plan in ('full', 'deposit')),
  add column amount_due_online numeric(12, 2) check (amount_due_online is null or amount_due_online >= 0),
  add column balance_due numeric(12, 2) not null default 0 check (balance_due >= 0),
  add column stock_committed boolean not null default false,
  add column incidence_reason text,
  add column cancel_reason text,
  add column meeting_point_details text;

-- Pedidos creados con la reserva anterior ya tienen el stock descontado
-- (salvo los cancelados, a los que la liberación ya se lo devolvió).
update orders set stock_committed = (status <> 'cancelled');

alter table orders
  add constraint chk_orders_shipping_method
    check (shipping_method in ('andreani', 'correo_argentino', 'meeting_point')),
  -- Bible §19: envío = pago completo; la seña del 50% y el efectivo son del punto de encuentro.
  add constraint chk_orders_payment_combination
    check (
      (payment_plan = 'full' or shipping_method = 'meeting_point')
      and (payment_method = 'mercado_pago' or shipping_method = 'meeting_point')
    );

comment on column orders.stock_committed is 'true si el stock de los ítems ya fue descontado (pago confirmado). Permite reponer exactamente lo descontado.';
comment on column orders.balance_due is 'Saldo a cobrar en la entrega (punto de encuentro: 50% restante o efectivo).';

-- Historial de estados para el tracking (Bible §33).
create table order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create index idx_order_status_history_order on order_status_history (order_id, created_at);

-- SECURITY DEFINER: el historial lo escribe el trigger sea quien sea que
-- cambie el estado (admin con su sesión, webhook con service_role).
create or replace function log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger trg_orders_status_history
  after insert or update of status on orders
  for each row execute function log_order_status();

insert into order_status_history (order_id, status, created_at)
select id, status, updated_at from orders;

alter table order_status_history enable row level security;

create policy "admin_read_order_status_history" on order_status_history
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on order_status_history to authenticated, service_role;
grant insert on order_status_history to service_role;

-- Pagos manuales (efectivo en punto de encuentro) registrados por el admin.
alter table payments drop constraint payments_provider_check;
alter table payments add constraint payments_provider_check check (provider in ('mercado_pago', 'cash'));

-- ----------------------------------------------------------------------------
-- create_order: crea el pedido SIN descontar stock.
-- ----------------------------------------------------------------------------
create or replace function create_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb, -- [{"variant_id": "...", "quantity": n}, ...]
  p_shipping_method text,
  p_shipping_address jsonb,
  p_shipping_cost numeric,
  p_payment_method text,
  p_payment_plan text,
  p_meeting_point_details text,
  p_lookup_token_hash text,
  p_lookup_token_expires_at timestamptz
)
returns orders
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_item jsonb;
  v_variant record;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_due_online numeric(12, 2);
  v_order orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order: p_items no puede estar vacío';
  end if;

  insert into customers (name, email, phone)
  values (p_customer_name, lower(p_customer_email), p_customer_phone)
  on conflict (lower(email)) do update
    set name = excluded.name,
        phone = excluded.phone,
        updated_at = now()
  returning id into v_customer_id;

  insert into orders (
    customer_id, status, subtotal, shipping_cost, total,
    shipping_method, shipping_address, payment_method, payment_plan,
    meeting_point_details, lookup_token_hash, lookup_token_expires_at,
    payment_expires_at
  ) values (
    v_customer_id, 'pending_payment', 0, p_shipping_cost, p_shipping_cost,
    p_shipping_method, p_shipping_address, p_payment_method, p_payment_plan,
    p_meeting_point_details, p_lookup_token_hash, p_lookup_token_expires_at,
    -- Ventana de pago online (valor ya vigente en el sistema). No reserva
    -- stock: solo ordena pedidos online abandonados. El efectivo no vence
    -- solo: lo gestiona el admin.
    case when p_payment_method = 'mercado_pago' then now() + interval '20 minutes' end
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_quantity for variant %', v_item ->> 'variant_id';
    end if;

    select pv.*, p.name as product_name, p.price as base_price, p.status as product_status,
           nullif(concat_ws(' / ', s.name, c.name), '') as variant_label_calc
      into v_variant
      from product_variants pv
      join products p on p.id = pv.product_id
      left join sizes s on s.id = pv.size_id
      left join colors c on c.id = pv.color_id
     where pv.id = (v_item ->> 'variant_id')::uuid;

    if v_variant is null or v_variant.product_status <> 'published' then
      raise exception 'variant_not_found: %', v_item ->> 'variant_id';
    end if;
    if not v_variant.is_active then
      raise exception 'variant_inactive: %', v_variant.id;
    end if;
    -- Verificación, no reserva: se puede pedir lo que hoy está disponible.
    if v_variant.stock < v_quantity then
      raise exception 'insufficient_stock: %', v_variant.id;
    end if;

    v_unit_price := coalesce(v_variant.price_override, v_variant.base_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity
    ) values (
      v_order.id, v_variant.product_id, v_variant.id, v_variant.product_name,
      v_variant.variant_label_calc, v_variant.sku, v_unit_price, v_quantity
    );

    v_subtotal := v_subtotal + v_unit_price * v_quantity;
  end loop;

  v_total := v_subtotal + p_shipping_cost;
  v_due_online := case
    when p_payment_method = 'cash' then 0
    when p_payment_plan = 'deposit' then round(v_total * 0.5, 2)
    else v_total
  end;

  update orders
     set subtotal = v_subtotal,
         total = v_total,
         amount_due_online = v_due_online,
         balance_due = v_total - v_due_online
   where id = v_order.id
   returning * into v_order;

  return v_order;
end;
$$;

comment on function create_order is
  'Crea pedido + ítems (snapshot) verificando disponibilidad SIN descontar stock (el carrito no reserva, Bible §17). Solo service_role.';

revoke all on function create_order from public;
grant execute on function create_order to service_role;

-- ----------------------------------------------------------------------------
-- confirm_order_payment: el primer pago confirmado gana el stock.
-- Resultado: 'confirmed' | 'already_committed' | 'stock_conflict' | 'not_confirmable'
-- ----------------------------------------------------------------------------
create or replace function confirm_order_payment(p_order_id uuid)
returns text
language plpgsql
as $$
declare
  v_order orders;
  v_item record;
  v_conflict boolean := false;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'order_not_found: %', p_order_id;
  end if;
  if v_order.stock_committed then
    return 'already_committed';
  end if;
  -- Un pago tardío de un pedido vencido también puede ganar (primer pago
  -- confirmado), siempre que siga habiendo stock.
  if not (
    v_order.status = 'pending_payment'
    or (v_order.status = 'cancelled' and v_order.cancel_reason = 'payment_expired')
  ) then
    return 'not_confirmable';
  end if;

  -- Bloqueo de las variantes en orden de id (evita deadlocks entre pagos
  -- simultáneos); el lock dura solo esta transacción.
  perform 1
     from product_variants pv
    where pv.id in (select variant_id from order_items where order_id = p_order_id)
    order by pv.id
    for update;

  for v_item in
    select x.variant_id, x.qty, pv.stock
      from (
        select variant_id, sum(quantity)::int as qty
          from order_items
         where order_id = p_order_id and variant_id is not null
         group by variant_id
      ) x
      join product_variants pv on pv.id = x.variant_id
  loop
    if v_item.stock < v_item.qty then
      v_conflict := true;
    end if;
  end loop;

  -- Ítems cuya variante ya no existe (variant_id NULL) no pueden cumplirse.
  if exists (select 1 from order_items where order_id = p_order_id and variant_id is null) then
    v_conflict := true;
  end if;

  if v_conflict then
    update orders
       set status = 'incidence',
           incidence_reason = 'stock_conflict',
           cancel_reason = null
     where id = p_order_id;
    return 'stock_conflict';
  end if;

  update product_variants pv
     set stock = pv.stock - x.qty
    from (
      select variant_id, sum(quantity)::int as qty
        from order_items where order_id = p_order_id
       group by variant_id
    ) x
   where pv.id = x.variant_id;

  update orders
     set status = 'payment_confirmed',
         stock_committed = true,
         cancel_reason = null,
         payment_expires_at = null
   where id = p_order_id;

  return 'confirmed';
end;
$$;

revoke all on function confirm_order_payment from public;
grant execute on function confirm_order_payment to service_role;

-- Repone el stock de un pedido solo si estaba comprometido.
create or replace function restore_order_stock(p_order_id uuid)
returns void
language plpgsql
as $$
begin
  update product_variants pv
     set stock = pv.stock + x.qty
    from (
      select oi.variant_id, sum(oi.quantity)::int as qty
        from order_items oi
        join orders o on o.id = oi.order_id
       where oi.order_id = p_order_id and o.stock_committed and oi.variant_id is not null
       group by oi.variant_id
    ) x
   where pv.id = x.variant_id;

  update orders set stock_committed = false where id = p_order_id;
end;
$$;

revoke all on function restore_order_stock from public;
grant execute on function restore_order_stock to service_role;

-- ----------------------------------------------------------------------------
-- record_payment_result: ahora confirma vía confirm_order_payment.
-- Devuelve el pago y deja el resultado de la confirmación en
-- payments.raw_reference? No: el resultado se consulta por el estado del
-- pedido. Firma sin cambios (compatibilidad con el webhook).
-- ----------------------------------------------------------------------------
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
  v_order orders;
  v_payment payments;
begin
  select * into v_order from orders where order_number = p_order_number for update;
  if v_order is null then
    raise exception 'order_not_found: %', p_order_number;
  end if;

  insert into payments (order_id, provider, external_id, status, amount, currency, raw_reference)
  values (v_order.id, p_provider, p_external_id, p_status, p_amount, p_currency, p_raw_reference)
  on conflict (provider, external_id) where external_id is not null do update
    set status = excluded.status,
        amount = excluded.amount,
        currency = excluded.currency,
        raw_reference = excluded.raw_reference,
        updated_at = now()
  returning * into v_payment;

  if p_status = 'approved' then
    perform confirm_order_payment(v_order.id);
  elsif p_status in ('refunded', 'charged_back')
        and v_order.status in ('payment_confirmed', 'preparing') then
    perform restore_order_stock(v_order.id);
    update orders set status = 'refunded' where id = v_order.id;
  end if;

  return v_payment;
end;
$$;

-- ----------------------------------------------------------------------------
-- Vencimiento de pedidos online impagos: se cancelan con motivo
-- 'payment_expired'. Solo reponen stock los pedidos que lo tenían
-- comprometido (reserva vieja); los nuevos no descontaron nada.
-- ----------------------------------------------------------------------------
create or replace function release_expired_stock_reservations()
returns integer
language plpgsql
as $$
declare
  v_order record;
  v_released integer := 0;
begin
  for v_order in
    select id from orders
     where status = 'pending_payment'
       and payment_expires_at is not null
       and payment_expires_at < now()
     for update skip locked
  loop
    perform restore_order_stock(v_order.id);
    update orders set status = 'cancelled', cancel_reason = 'payment_expired' where id = v_order.id;
    v_released := v_released + 1;
  end loop;
  return v_released;
end;
$$;

-- ----------------------------------------------------------------------------
-- Operaciones del admin (sesión de admin activo, no service_role).
-- ----------------------------------------------------------------------------
create or replace function is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins a where a.id = auth.uid() and a.is_active);
$$;

revoke all on function is_active_admin from public;
grant execute on function is_active_admin to authenticated, service_role;

-- Pago en efectivo / saldo cobrado en la entrega (punto de encuentro).
-- Si el pedido todavía no estaba confirmado, este pago lo confirma (y compite
-- por el stock como cualquier otro pago confirmado).
create or replace function admin_register_manual_payment(p_order_id uuid, p_amount numeric)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
  v_result text := 'balance_updated';
begin
  if not is_active_admin() then
    raise exception 'not_allowed';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'order_not_found: %', p_order_id;
  end if;
  if v_order.status in ('cancelled', 'refunded') and coalesce(v_order.cancel_reason, '') <> 'payment_expired' then
    raise exception 'order_closed';
  end if;

  insert into payments (order_id, provider, status, amount, currency)
  values (p_order_id, 'cash', 'approved', p_amount, 'ARS');

  update orders set balance_due = greatest(balance_due - p_amount, 0) where id = p_order_id;

  if not v_order.stock_committed then
    v_result := confirm_order_payment(p_order_id);
  end if;
  return v_result;
end;
$$;

revoke all on function admin_register_manual_payment from public;
grant execute on function admin_register_manual_payment to authenticated;

-- Cancelación operativa por el admin: repone el stock si estaba comprometido.
create or replace function admin_cancel_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  if not is_active_admin() then
    raise exception 'not_allowed';
  end if;
  select * into v_order from orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'order_not_found: %', p_order_id;
  end if;
  if v_order.status not in ('pending_payment', 'payment_confirmed', 'preparing', 'incidence') then
    raise exception 'invalid_transition';
  end if;
  perform restore_order_stock(p_order_id);
  update orders
     set status = 'cancelled',
         cancel_reason = coalesce(nullif(trim(p_reason), ''), 'admin')
   where id = p_order_id;
end;
$$;

revoke all on function admin_cancel_order from public;
grant execute on function admin_cancel_order to authenticated;

-- ----------------------------------------------------------------------------
-- EMAIL_LOG: trazabilidad de emails transaccionales. El proveedor definitivo
-- está pendiente (Roadmap): mientras no exista, cada envío queda 'skipped'.
-- ----------------------------------------------------------------------------
create table email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders (id) on delete set null,
  template text not null,
  recipient text not null,
  provider text not null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index idx_email_log_order on email_log (order_id, created_at desc);

alter table email_log enable row level security;

create policy "admin_read_email_log" on email_log
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on email_log to authenticated;
grant select, insert on email_log to service_role;

-- Permisos del service_role para el flujo nuevo.
grant select on delivery_methods, payment_settings to service_role;
grant select, update on orders to service_role;
