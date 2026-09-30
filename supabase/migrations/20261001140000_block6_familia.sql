-- ============================================================================
-- Bloque 6 — Familia GxK (Bible §23 Familia, §24 Members Only, §25 Camino
-- G & K, §36 Analytics; Roadmap Bloque 6).
--
-- - Registro OPCIONAL: comprar sigue sin requerir cuenta. Un miembro es un
--   usuario de Supabase Auth con email confirmado y fila en member_profiles.
-- - Los pedidos se vinculan al miembro por email (customers es único por
--   lower(email)): así "Mis pedidos" y el Camino incluyen las compras hechas
--   con ese email, con o sin sesión.
-- - Members Only: contenido exclusivo (universe_entries/events members_only)
--   y 24H EARLY ACCESS de productos (products.members_only_until): hasta esa
--   fecha solo lo ven/compran miembros; después pasa solo a público.
-- - Camino G & K: 10 estaciones, 1 compra confirmada = 1 estación, solo
--   pedidos pagados/confirmados no cancelados ni devueltos. Estación 5 = 20%,
--   estación 10 = hasta 50%. Las condiciones, límites y margen NO están
--   definidos: los beneficios quedan deshabilitados (camino_settings) hasta
--   que el admin los configure.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Miembros
-- ----------------------------------------------------------------------------
create table member_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_member_profiles_updated_at
  before update on member_profiles
  for each row execute function set_updated_at();

-- Email del miembro con sesión (solo si confirmó el email y tiene perfil).
create or replace function current_member_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)
    from auth.users u
    join member_profiles m on m.user_id = u.id
   where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

create or replace function is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_member_email() is not null;
$$;

revoke all on function current_member_email from public;
revoke all on function is_member from public;
grant execute on function current_member_email to anon, authenticated, service_role;
grant execute on function is_member to anon, authenticated, service_role;

-- Miembro (user_id) dueño de un email de cliente, si existe.
create or replace function member_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id
    from member_profiles m
    join auth.users u on u.id = m.user_id
   where lower(u.email) = lower(p_email) and u.email_confirmed_at is not null
   limit 1;
$$;

revoke all on function member_for_email from public, anon, authenticated;
grant execute on function member_for_email to service_role;

create table member_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '',
  street_name text not null,
  street_number text not null,
  floor text not null default '',
  apartment text not null default '',
  locality text not null,
  province text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_member_addresses_user on member_addresses (user_id);

create table member_favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table member_profiles enable row level security;
alter table member_addresses enable row level security;
alter table member_favorites enable row level security;

create policy "own_member_profile_read" on member_profiles for select to authenticated
  using (user_id = auth.uid() or is_active_admin());
create policy "own_member_profile_update" on member_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_member_addresses" on member_addresses for all to authenticated
  using (user_id = auth.uid() and is_member()) with check (user_id = auth.uid() and is_member());
create policy "own_member_favorites" on member_favorites for all to authenticated
  using (user_id = auth.uid() and is_member()) with check (user_id = auth.uid() and is_member());

grant select, update (first_name, last_name, phone) on member_profiles to authenticated;
grant select, insert, update, delete on member_profiles to service_role;
grant select, insert, update, delete on member_addresses, member_favorites to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Members Only — 24H EARLY ACCESS de productos
-- ----------------------------------------------------------------------------
alter table products add column members_only_until timestamptz;

comment on column products.members_only_until is
  'Early access Members Only (Bible §24): hasta esta fecha solo miembros lo ven y compran; después pasa automáticamente a público.';

drop policy "public_read_products" on products;
create policy "public_read_products" on products
  for select
  using (status = 'published' and (members_only_until is null or members_only_until <= now() or is_member()));

create or replace view storefront_product_variants as
select
  pv.id,
  pv.product_id,
  pv.size_id,
  pv.color_id,
  pv.sku,
  pv.price_override,
  pv.is_active,
  (pv.stock > 0) as in_stock
from product_variants pv
join products p on p.id = pv.product_id
where pv.is_active and p.status = 'published'
  and (p.members_only_until is null or p.members_only_until <= now() or is_member());

-- Contenido exclusivo e invitaciones: miembros leen lo publicado members_only.
create policy "member_read_universe_entries" on universe_entries for select to authenticated
  using (status = 'published' and members_only and is_member());
create policy "member_read_universe_entry_media" on universe_entry_media for select to authenticated
  using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and e.members_only) and is_member());
create policy "member_read_universe_entry_products" on universe_entry_products for select to authenticated
  using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and e.members_only) and is_member());
create policy "member_read_universe_entry_outfits" on universe_entry_outfits for select to authenticated
  using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and e.members_only) and is_member());
create policy "member_read_events" on events for select to authenticated
  using (status = 'published' and members_only and is_member());

-- ----------------------------------------------------------------------------
-- Camino G & K
-- ----------------------------------------------------------------------------
create table camino_settings (
  id boolean primary key default true check (id),
  -- Apagado hasta definir condiciones, límites y margen (Roadmap: pendiente).
  rewards_enabled boolean not null default false,
  -- Bible: estación 10 = "hasta 50%". El porcentaje exacto no está definido.
  station10_percent numeric(5, 2) check (station10_percent > 0 and station10_percent <= 50),
  -- Límite opcional por beneficio (Bible: "sujetos a condiciones, límites y margen").
  max_discount_amount numeric(12, 2) check (max_discount_amount > 0),
  conditions text,
  updated_at timestamptz not null default now()
);

insert into camino_settings (id) values (true);

create trigger trg_camino_settings_updated_at
  before update on camino_settings
  for each row execute function set_updated_at();

alter table camino_settings enable row level security;
create policy "public_read_camino_settings" on camino_settings for select using (true);
create policy "admin_update_camino_settings" on camino_settings for update to authenticated
  using (is_active_admin()) with check (is_active_admin());
grant select on camino_settings to anon, authenticated, service_role;
grant update on camino_settings to authenticated;

create table camino_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle integer not null check (cycle >= 1),
  station integer not null check (station in (5, 10)),
  status text not null default 'available' check (status in ('available', 'used', 'void')),
  order_id uuid references orders (id) on delete set null,
  percent numeric(5, 2),
  discount_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  unique (user_id, cycle, station)
);

alter table camino_rewards enable row level security;
create policy "own_camino_rewards_read" on camino_rewards for select to authenticated
  using (user_id = auth.uid() or is_active_admin());
grant select on camino_rewards to authenticated;
grant select, insert, update on camino_rewards to service_role;

-- Descuento del Camino aplicado al pedido (sobre las prendas, no el envío).
alter table orders add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0);
alter table orders add column camino_reward_id uuid references camino_rewards (id) on delete set null;
alter table orders drop constraint chk_order_total;
alter table orders add constraint chk_order_total check (total = subtotal - discount_amount + shipping_cost);

-- Compras que cuentan: pagadas/confirmadas, no canceladas ni devueltas.
create or replace function camino_confirmed_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from orders o
    join customers c on c.id = o.customer_id
    join auth.users u on lower(u.email) = lower(c.email) and u.email_confirmed_at is not null
   where u.id = p_user_id
     and o.status in ('payment_confirmed', 'preparing', 'shipped', 'delivered');
$$;

-- Emite (idempotente) los beneficios de las estaciones alcanzadas y anula
-- los disponibles cuya compra dejó de contar (cancelación/devolución).
create or replace function sync_camino_rewards(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := camino_confirmed_count(p_user_id);
  v_cycle integer;
  v_inserted integer;
begin
  for v_cycle in 1 .. (v_count / 10) + 1 loop
    if v_count >= (v_cycle - 1) * 10 + 5 then
      insert into camino_rewards (user_id, cycle, station) values (p_user_id, v_cycle, 5)
      on conflict do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted > 0 then
        insert into member_notifications (user_id, kind, payload)
        values (p_user_id, 'camino', jsonb_build_object('cycle', v_cycle, 'station', 5));
      end if;
    end if;
    if v_count >= v_cycle * 10 then
      insert into camino_rewards (user_id, cycle, station) values (p_user_id, v_cycle, 10)
      on conflict do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted > 0 then
        insert into member_notifications (user_id, kind, payload)
        values (p_user_id, 'camino', jsonb_build_object('cycle', v_cycle, 'station', 10));
      end if;
    end if;
  end loop;

  update camino_rewards
     set status = 'void'
   where user_id = p_user_id
     and status = 'available'
     and (cycle - 1) * 10 + station > v_count;

  return v_count;
end;
$$;

revoke all on function camino_confirmed_count from public, anon, authenticated;
revoke all on function sync_camino_rewards from public, anon, authenticated;
grant execute on function camino_confirmed_count, sync_camino_rewards to service_role;

-- Si el pedido que usó un beneficio se cancela o devuelve, el beneficio
-- vuelve a estar disponible; si un pago tardío lo confirma, se vuelve a tomar.
create or replace function sync_order_camino_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.camino_reward_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  if new.status in ('cancelled', 'refunded') then
    update camino_rewards
       set status = 'available', order_id = null, used_at = null, percent = null, discount_amount = null
     where id = new.camino_reward_id and order_id = new.id and status = 'used';
  elsif old.status in ('cancelled', 'refunded') then
    update camino_rewards
       set status = 'used', order_id = new.id, used_at = now(), discount_amount = new.discount_amount
     where id = new.camino_reward_id and status = 'available';
  end if;
  return new;
end;
$$;

create trigger trg_orders_camino_reward
  after update of status on orders
  for each row execute function sync_order_camino_reward();

-- ----------------------------------------------------------------------------
-- Notificaciones de miembros
-- ----------------------------------------------------------------------------
create table member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('order_status', 'camino', 'broadcast')),
  order_id uuid references orders (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_member_notifications_user on member_notifications (user_id, created_at desc);

alter table member_notifications enable row level security;
create policy "own_member_notifications_read" on member_notifications for select to authenticated
  using (user_id = auth.uid());
create policy "own_member_notifications_mark_read" on member_notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update (read_at) on member_notifications to authenticated;
grant select, insert, update on member_notifications to service_role;

-- Cada cambio de estado de un pedido de un miembro le llega como notificación.
create or replace function notify_member_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_user uuid;
begin
  if new.status = 'pending_payment' then
    return new;
  end if;
  select o.order_number, c.email into v_order
    from orders o join customers c on c.id = o.customer_id
   where o.id = new.order_id;
  v_user := member_for_email(v_order.email);
  if v_user is not null then
    -- El Camino avanza (o retrocede, si se cancela/devuelve) con el pedido.
    perform sync_camino_rewards(v_user);
    insert into member_notifications (user_id, kind, order_id, payload)
    values (v_user, 'order_status', new.order_id,
            jsonb_build_object('order_number', v_order.order_number, 'status', new.status));
  end if;
  return new;
end;
$$;

create trigger trg_order_status_history_notify
  after insert on order_status_history
  for each row execute function notify_member_order_status();

-- Comunicación del admin a toda la Familia (beneficios, invitaciones, prelaunches).
create or replace function admin_broadcast_notification(p_title text, p_body text, p_link text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not is_active_admin() then
    raise exception 'not_admin';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'missing_title';
  end if;
  insert into member_notifications (user_id, kind, title, body, link)
  select m.user_id, 'broadcast', trim(p_title), nullif(trim(p_body), ''), nullif(trim(p_link), '')
    from member_profiles m
    join auth.users u on u.id = m.user_id
   where u.email_confirmed_at is not null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function admin_broadcast_notification from public;
grant execute on function admin_broadcast_notification to authenticated;

-- ----------------------------------------------------------------------------
-- create_order: + early access y beneficio del Camino.
-- ----------------------------------------------------------------------------
drop function create_order(text, text, text, jsonb, text, jsonb, numeric, text, text, text, text, timestamptz);

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
  p_lookup_token_expires_at timestamptz,
  -- El servidor lo determina por la sesión (miembro con email confirmado).
  p_is_member boolean default false,
  p_camino_reward_id uuid default null
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
  v_discount numeric(12, 2) := 0;
  v_percent numeric(5, 2);
  v_total numeric(12, 2);
  v_due_online numeric(12, 2);
  v_reward camino_rewards;
  v_settings camino_settings;
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
    case when p_payment_method = 'mercado_pago' then now() + interval '20 minutes' end
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::int;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_quantity for variant %', v_item ->> 'variant_id';
    end if;

    select pv.*, p.name as product_name, p.price as base_price, p.status as product_status,
           p.members_only_until,
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
    if not p_is_member and v_variant.members_only_until is not null and v_variant.members_only_until > now() then
      raise exception 'members_only: %', v_variant.id;
    end if;
    if not v_variant.is_active then
      raise exception 'variant_inactive: %', v_variant.id;
    end if;
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

  if p_camino_reward_id is not null then
    select * into v_settings from camino_settings;
    select * into v_reward from camino_rewards where id = p_camino_reward_id for update;
    if v_reward.id is null
       or v_reward.status <> 'available'
       or member_for_email(p_customer_email) is distinct from v_reward.user_id
       or not v_settings.rewards_enabled then
      raise exception 'reward_unavailable: %', p_camino_reward_id;
    end if;
    v_percent := case when v_reward.station = 5 then 20 else v_settings.station10_percent end;
    if v_percent is null then
      raise exception 'reward_unavailable: %', p_camino_reward_id;
    end if;
    v_discount := round(v_subtotal * v_percent / 100, 2);
    if v_settings.max_discount_amount is not null then
      v_discount := least(v_discount, v_settings.max_discount_amount);
    end if;
    update camino_rewards
       set status = 'used', order_id = v_order.id, used_at = now(), percent = v_percent, discount_amount = v_discount
     where id = v_reward.id;
  end if;

  v_total := v_subtotal - v_discount + p_shipping_cost;
  v_due_online := case
    when p_payment_method = 'cash' then 0
    when p_payment_plan = 'deposit' then round(v_total * 0.5, 2)
    else v_total
  end;

  update orders
     set subtotal = v_subtotal,
         discount_amount = v_discount,
         camino_reward_id = p_camino_reward_id,
         total = v_total,
         amount_due_online = v_due_online,
         balance_due = v_total - v_due_online
   where id = v_order.id
   returning * into v_order;

  return v_order;
end;
$$;

comment on function create_order is
  'Crea pedido + ítems (snapshot) verificando disponibilidad SIN descontar stock (Bible §17), early access Members Only y beneficio del Camino. Solo service_role.';

revoke all on function create_order from public, anon, authenticated;
grant execute on function create_order to service_role;

-- ----------------------------------------------------------------------------
-- Analytics (Bible §36)
-- ----------------------------------------------------------------------------
create table analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (event in (
    'page_view', 'product_view', 'search', 'add_to_cart', 'checkout_started',
    'order_created', 'outfit_view', 'entry_view'
  )),
  session_id text not null check (char_length(session_id) between 8 and 64),
  path text check (char_length(path) <= 300),
  product_id uuid,
  outfit_id uuid,
  entry_id uuid,
  order_id uuid,
  query text check (char_length(query) <= 120),
  quantity integer,
  value numeric(12, 2),
  created_at timestamptz not null default now()
);

create index idx_analytics_events_event_created on analytics_events (event, created_at desc);
create index idx_analytics_events_session on analytics_events (session_id);

alter table analytics_events enable row level security;
create policy "admin_read_analytics_events" on analytics_events for select to authenticated
  using (is_active_admin());
grant select on analytics_events to authenticated;
grant select, insert on analytics_events to service_role;

-- Resumen para el Admin: métricas de la Bible §36 en un rango.
create or replace function admin_analytics_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_paid constant text[] := array['payment_confirmed', 'preparing', 'shipped', 'delivered'];
  v_result jsonb;
begin
  if not is_active_admin() then
    raise exception 'not_admin';
  end if;

  with ev as (
    select * from analytics_events where created_at >= p_from and created_at < p_to
  ),
  sessions as (select count(distinct session_id) as n from ev),
  cart_sessions as (select distinct session_id from ev where event = 'add_to_cart'),
  checkout_sessions as (select distinct session_id from ev where event = 'checkout_started'),
  order_sessions as (select distinct session_id from ev where event = 'order_created'),
  paid_orders as (
    select o.id, o.total from orders o
     where o.created_at >= p_from and o.created_at < p_to and o.status = any (v_paid)
  )
  select jsonb_build_object(
    'sessions', (select n from sessions),
    'page_views', (select count(*) from ev where event = 'page_view'),
    'product_views', (select count(*) from ev where event = 'product_view'),
    'searches', (select count(*) from ev where event = 'search'),
    'add_to_cart', (select count(*) from ev where event = 'add_to_cart'),
    'checkouts_started', (select count(*) from checkout_sessions),
    'cart_abandoned', (select count(*) from cart_sessions c where not exists (select 1 from order_sessions o where o.session_id = c.session_id)),
    'checkout_abandoned', (select count(*) from checkout_sessions c where not exists (select 1 from order_sessions o where o.session_id = c.session_id)),
    'orders_created', (select count(*) from orders where created_at >= p_from and created_at < p_to),
    'orders_paid', (select count(*) from paid_orders),
    'revenue', (select coalesce(sum(total), 0) from paid_orders),
    'sessions_with_order', (select count(*) from order_sessions),
    'top_paths', (select coalesce(jsonb_agg(t), '[]') from (
      select path, count(*) as n from ev where event = 'page_view' and path is not null
       group by path order by n desc limit 10) t),
    'top_searches', (select coalesce(jsonb_agg(t), '[]') from (
      select lower(query) as query, count(*) as n from ev where event = 'search' and query is not null
       group by lower(query) order by n desc limit 10) t),
    'top_products', (select coalesce(jsonb_agg(t), '[]') from (
      select p.name, count(*) filter (where ev.event = 'product_view') as views,
             count(*) filter (where ev.event = 'add_to_cart') as adds
        from ev join products p on p.id = ev.product_id
       where ev.event in ('product_view', 'add_to_cart')
       group by p.name order by views desc limit 10) t),
    'outfits', (select coalesce(jsonb_agg(t), '[]') from (
      select o.name as title,
             count(*) filter (where ev.event = 'outfit_view') as views,
             count(*) filter (where ev.event = 'add_to_cart') as adds,
             count(distinct ev.order_id) filter (
               where ev.event = 'order_created' and ev.order_id in (select id from paid_orders)
             ) as orders_paid
        from ev join outfits o on o.id = ev.outfit_id
       group by o.id, o.name order by views desc limit 10) t),
    -- Campañas que generan ventas: sesiones que vieron la entrada y
    -- terminaron en un pedido pagado.
    'entries', (select coalesce(jsonb_agg(t), '[]') from (
      select e.title,
             count(*) filter (where ev.event = 'entry_view') as views,
             (select count(distinct oc.order_id) from ev oc
               where oc.event = 'order_created'
                 and oc.order_id in (select id from paid_orders)
                 and oc.session_id in (select v.session_id from ev v where v.event = 'entry_view' and v.entry_id = e.id)
             ) as orders_paid
        from ev join universe_entries e on e.id = ev.entry_id
       where ev.event = 'entry_view'
       group by e.id, e.title order by views desc limit 10) t),
    'sold_out', (select coalesce(jsonb_agg(t), '[]') from (
      select p.name from products p
       where p.status = 'published'
         and not exists (select 1 from product_variants pv where pv.product_id = p.id and pv.is_active and pv.stock > 0)
       order by p.name limit 50) t)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function admin_analytics_summary from public;
grant execute on function admin_analytics_summary to authenticated;
