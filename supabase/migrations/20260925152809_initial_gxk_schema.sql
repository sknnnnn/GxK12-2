-- ============================================================================
-- GXK12.2 — Migración inicial del esquema
-- Fuente: 03 — Arquitectura técnica.md (contrastado con 01 — Requerimientos.md
-- y 02 — Arquitectura funcional.md) + decisiones confirmadas en revisión.
--
-- gen_random_uuid() es nativo desde PostgreSQL 13 (pg_catalog), no requiere
-- extensión adicional en el proyecto Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Funciones utilitarias
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- CATEGORIES
-- ============================================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_active_sort on categories (is_active, sort_order);

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function set_updated_at();

comment on table categories is 'Categorías del catálogo. Organizan productos; creables desde el admin sin límite técnico.';

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'hidden', 'discontinued')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category on products (category_id);
create index idx_products_catalog on products (status, category_id, created_at desc);
create index idx_products_featured on products (is_featured) where is_featured;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

comment on table products is 'Unidad base del catálogo. El stock real vive en product_variants, no acá.';

-- ============================================================================
-- PRODUCT_IMAGES
-- ============================================================================
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_product_images_product on product_images (product_id, sort_order);

-- A lo sumo una portada por producto.
create unique index uq_product_images_primary
  on product_images (product_id)
  where is_primary;

comment on table product_images is 'Imágenes de producto en Supabase Storage; storage_path referencia el objeto físico.';

-- ============================================================================
-- SIZES
-- ============================================================================
create table sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sizes_active_sort on sizes (is_active, sort_order);

create trigger trg_sizes_updated_at
  before update on sizes
  for each row execute function set_updated_at();

-- ============================================================================
-- COLORS
-- ============================================================================
create table colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  hex_code text check (hex_code is null or hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_colors_updated_at
  before update on colors
  for each row execute function set_updated_at();

-- ============================================================================
-- PRODUCT_VARIANTS
-- ============================================================================
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  size_id uuid references sizes (id) on delete restrict,
  color_id uuid references colors (id) on delete restrict,
  sku text,
  price_override numeric(12, 2) check (price_override is null or price_override >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Combinación producto + talle + color única. size_id/color_id son NULLABLE
-- (hay productos sin talle y/o sin color), así que se trata el NULL como un
-- valor fijo mediante coalesce a un sentinel, evitando duplicados aun cuando
-- alguno de los dos atributos no aplica.
create unique index uq_variant_combo on product_variants (
  product_id,
  coalesce(size_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(color_id, '00000000-0000-0000-0000-000000000000')
);

create unique index uq_variant_sku on product_variants (sku) where sku is not null;
create index idx_variants_product on product_variants (product_id, is_active);
create index idx_variants_low_stock on product_variants (stock) where is_active;

create trigger trg_variants_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

comment on table product_variants is 'Combinación comprable talle/color. Fuente de verdad del stock.';

-- ============================================================================
-- OUTFITS
-- ============================================================================
create table outfits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'hidden')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_outfit_dates
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index idx_outfits_status on outfits (status);
create index idx_outfits_dates on outfits (starts_at, ends_at);

create trigger trg_outfits_updated_at
  before update on outfits
  for each row execute function set_updated_at();

-- ============================================================================
-- OUTFIT_PRODUCTS
-- Decisión confirmada: agrega variant_id NULLABLE. product_id sigue
-- obligatorio (el outfit siempre referencia un producto; variant_id lo
-- refina opcionalmente a una variante concreta de ese mismo producto).
-- ============================================================================
create table outfit_products (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  sort_order integer not null default 0
);

-- Evita duplicar la misma combinación (outfit, producto, variante).
-- variant_id NULL ("producto completo") se trata como un valor fijo vía
-- coalesce, para que no se pueda repetir la misma fila "genérica" dos veces,
-- mientras se permite que el mismo producto aparezca una vez como entrada
-- genérica y, por separado, una vez por cada variante concreta distinta.
create unique index uq_outfit_products_combo on outfit_products (
  outfit_id,
  product_id,
  coalesce(variant_id, '00000000-0000-0000-0000-000000000000')
);

create index idx_outfit_products_outfit on outfit_products (outfit_id, sort_order);
create index idx_outfit_products_product on outfit_products (product_id);
create index idx_outfit_products_variant on outfit_products (variant_id);

-- Integridad: si se especifica variant_id, debe pertenecer al product_id de
-- la misma fila (no se puede asociar una variante de OTRO producto).
create or replace function check_outfit_product_variant()
returns trigger
language plpgsql
as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from product_variants pv
    where pv.id = new.variant_id and pv.product_id = new.product_id
  ) then
    raise exception 'variant_id % no pertenece a product_id %', new.variant_id, new.product_id;
  end if;
  return new;
end;
$$;

create trigger trg_outfit_products_check_variant
  before insert or update on outfit_products
  for each row execute function check_outfit_product_variant();

comment on table outfit_products is 'N-N entre outfits y products; variant_id opcional para fijar una variante concreta.';

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Único case-insensitive: mismo email siempre resuelve al mismo customer_id
-- (upsert en create_order_with_reservation vía ON CONFLICT (lower(email))).
create unique index uq_customers_email on customers (lower(email));

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

comment on table customers is 'Persisten para asociar pedidos aunque no exista login. Sin credenciales.';

-- ============================================================================
-- ORDERS
-- ============================================================================
create sequence order_number_seq start 1;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers (id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment', 'payment_confirmed', 'preparing', 'shipped',
      'delivered', 'cancelled', 'refunded', 'incidence'
    )),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  total numeric(12, 2) not null check (total >= 0),
  shipping_method text not null,
  -- Estructura abierta: datos exactos por transportista pendientes de validar
  -- (Andreani / Correo Argentino) según los 3 documentos fuente.
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  lookup_token_hash text not null unique,
  lookup_token_expires_at timestamptz,
  -- Sostiene la reserva de stock: mientras status = 'pending_payment', indica
  -- cuándo debe liberarse el stock reservado si no llega confirmación de pago.
  payment_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_order_total check (total = subtotal + shipping_cost)
);

alter sequence order_number_seq owned by orders.order_number;

create index idx_orders_customer on orders (customer_id);
create index idx_orders_status_created on orders (status, created_at desc);
create index idx_orders_pending_expiry
  on orders (payment_expires_at)
  where status = 'pending_payment';

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- order_number formato confirmado: GXK-000001, secuencial, independiente del UUID.
create or replace function set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'GXK-' || lpad(nextval('order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_orders_set_order_number
  before insert on orders
  for each row execute function set_order_number();

comment on table orders is 'Pedido en pending_payment = reserva de stock activa (Opción A, sin tabla de reservas separada).';

-- ============================================================================
-- ORDER_ITEMS
-- Snapshot histórico: nombre, variante, SKU, precio y cantidad se congelan
-- al momento de la compra e ignoran cambios posteriores del catálogo.
-- ============================================================================
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  sku text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) generated always as (unit_price * quantity) stored
);

create index idx_order_items_order on order_items (order_id);
create index idx_order_items_product on order_items (product_id);
create index idx_order_items_variant on order_items (variant_id);

comment on table order_items is 'Snapshot inmutable de la compra. product_id/variant_id -> SET NULL si el catálogo cambia; los campos de snapshot no se tocan.';

-- ============================================================================
-- PAYMENTS
-- Relación 1:N con orders (decisión confirmada): un pedido puede tener
-- varios intentos de pago (reintentos de Mercado Pago).
-- ============================================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'mercado_pago' check (provider in ('mercado_pago')),
  external_id text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'ARS' check (currency ~ '^[A-Z]{3}$'),
  raw_reference jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_order on payments (order_id);
create index idx_payments_status on payments (status);
create unique index uq_payments_provider_external
  on payments (provider, external_id)
  where external_id is not null;

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

comment on table payments is 'Estado del pago, independiente del estado operativo del pedido. Escritura solo vía webhook validado (service-role).';

-- ============================================================================
-- SHIPMENTS
-- Relación 1:N con orders (decisión confirmada).
-- ============================================================================
create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null check (provider in ('andreani', 'correo_argentino')),
  service_type text,
  external_id text,
  tracking_number text,
  label_url text,
  cost numeric(12, 2) check (cost is null or cost >= 0),
  -- Sin CHECK de valores: el conjunto exacto de estados depende de cada
  -- proveedor y está pendiente de validar (arquitectura funcional §4).
  status text,
  destination_type text check (destination_type is null or destination_type in ('address', 'branch')),
  destination_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_shipments_order on shipments (order_id);
create index idx_shipments_status on shipments (status);
create unique index uq_shipments_provider_external
  on shipments (provider, external_id)
  where external_id is not null;

create trigger trg_shipments_updated_at
  before update on shipments
  for each row execute function set_updated_at();

comment on table shipments is 'Registro logístico. destination_type inferido de Requerimientos (domicilio/sucursal); ver puntos pendientes.';

-- ============================================================================
-- ADMINS
-- 1:1 con auth.users. is_active controla el acceso administrativo.
-- ============================================================================
create table admins (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table admins is 'Extensión de auth.users para autorización admin. No es un sistema de auth paralelo.';

-- ============================================================================
-- VISTA PÚBLICA: storefront_product_variants
--
-- No lleva `security_invoker`: se apoya deliberadamente en los privilegios
-- del owner de la vista para leer product_variants/products (a los que anon
-- no tiene GRANT directo), y expone únicamente columnas seguras. La
-- proyección de columnas ES la barrera de seguridad -- así se cumple
-- "identificar productos sin stock" sin revelar el conteo interno exacto.
-- ============================================================================
create view storefront_product_variants as
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
where pv.is_active and p.status = 'published';

comment on view storefront_product_variants is 'Proyección pública de variantes: expone in_stock (booleano), nunca el conteo real de stock.';

-- ============================================================================
-- RESERVA DE STOCK (Opción A confirmada): el pedido en pending_payment ES la
-- reserva. Descuento atómico condicional (stock = stock - qty WHERE stock >=
-- qty) dentro de una única función transaccional; todo o nada.
-- ============================================================================
create or replace function create_order_with_reservation(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb, -- [{"variant_id": "...", "quantity": n}, ...]
  p_shipping_method text,
  p_shipping_address jsonb,
  p_shipping_cost numeric,
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
    shipping_method, shipping_address,
    lookup_token_hash, lookup_token_expires_at, payment_expires_at
  ) values (
    v_customer_id, 'pending_payment', 0, p_shipping_cost, p_shipping_cost,
    p_shipping_method, p_shipping_address,
    p_lookup_token_hash, p_lookup_token_expires_at,
    -- Duración de reserva confirmada: 20 minutos.
    now() + interval '20 minutes'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::int;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_quantity for variant %', v_item ->> 'variant_id';
    end if;

    -- FOR UPDATE OF pv: bloquea únicamente la fila de product_variants.
    -- products/sizes/colors quedan fuera del lock para no serializar
    -- checkouts de variantes distintas que comparten talle/color/producto.
    select pv.*, p.name as product_name, p.price as base_price,
           nullif(concat_ws(' / ', s.name, c.name), '') as variant_label_calc
      into v_variant
      from product_variants pv
      join products p on p.id = pv.product_id
      left join sizes s on s.id = pv.size_id
      left join colors c on c.id = pv.color_id
     where pv.id = (v_item ->> 'variant_id')::uuid
     for update of pv;

    if v_variant is null then
      raise exception 'variant_not_found: %', v_item ->> 'variant_id';
    end if;

    if not v_variant.is_active then
      raise exception 'variant_inactive: %', v_variant.id;
    end if;

    -- Descuento atómico condicional: evita overselling por concurrencia.
    update product_variants
       set stock = stock - v_quantity
     where id = v_variant.id
       and stock >= v_quantity;

    if not found then
      raise exception 'insufficient_stock: %', v_variant.id;
    end if;

    v_unit_price := coalesce(v_variant.price_override, v_variant.base_price);

    insert into order_items (
      order_id, product_id, variant_id, product_name, variant_label,
      sku, unit_price, quantity
    ) values (
      v_order.id, v_variant.product_id, v_variant.id, v_variant.product_name,
      v_variant.variant_label_calc, v_variant.sku, v_unit_price, v_quantity
    );

    v_subtotal := v_subtotal + v_unit_price * v_quantity;
  end loop;

  update orders
     set subtotal = v_subtotal,
         total = v_subtotal + p_shipping_cost
   where id = v_order.id
   returning * into v_order;

  return v_order;
end;
$$;

comment on function create_order_with_reservation is
  'Checkout atómico: valida stock, reserva (descuenta) y crea order + order_items en una sola transacción. Solo debe invocarse server-side (service-role), nunca desde el navegador.';

-- Función de negocio sensible: SOLO service_role puede ejecutarla. Por
-- defecto Postgres otorga EXECUTE a PUBLIC en funciones nuevas -- sin este
-- REVOKE, anon podría invocarla directamente vía supabase.rpc() desde el
-- navegador y manipular stock/pedidos saltándose toda la revalidación de la
-- app.
revoke all on function create_order_with_reservation from public;
grant execute on function create_order_with_reservation to service_role;

-- ----------------------------------------------------------------------------
-- Liberación de reservas vencidas.
-- Preferencia confirmada: pg_cron si está disponible en el proyecto. La
-- función queda lista pero el cron NO se activa en esta migración (ver
-- bloque comentado al final) -- requiere confirmar disponibilidad de
-- pg_cron y autorización explícita antes de programarlo.
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
    update product_variants pv
       set stock = pv.stock + oi.quantity
      from order_items oi
     where oi.order_id = v_order.id
       and oi.variant_id = pv.id;

    update orders set status = 'cancelled' where id = v_order.id;

    v_released := v_released + 1;
  end loop;

  return v_released;
end;
$$;

comment on function release_expired_stock_reservations is
  'Libera stock de pedidos pending_payment vencidos (payment_expires_at < now()) y los marca cancelled. Pensada para ejecutarse periódicamente (pg_cron u otro scheduler), no desde el cliente.';

revoke all on function release_expired_stock_reservations from public;
grant execute on function release_expired_stock_reservations to service_role;

-- NO ACTIVADO EN ESTA MIGRACIÓN. Requiere confirmar que pg_cron está
-- habilitado en el proyecto y autorización explícita antes de programarlo:
--
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'release-expired-stock-reservations',
--   '*/2 * * * *',
--   $$select release_expired_stock_reservations();$$
-- );

-- ============================================================================
-- ROW LEVEL SECURITY
-- Se habilita explícitamente en cada tabla sin depender del comportamiento
-- del toggle "automatic RLS" del proyecto.
-- ============================================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table sizes enable row level security;
alter table colors enable row level security;
alter table product_variants enable row level security;
alter table outfits enable row level security;
alter table outfit_products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table shipments enable row level security;
alter table admins enable row level security;

-- ----------------------------------------------------------------------------
-- Público (anon + authenticated): SELECT de contenido publicado únicamente.
-- ----------------------------------------------------------------------------
create policy "public_read_categories" on categories
  for select
  using (is_active);

create policy "public_read_products" on products
  for select
  using (status = 'published');

create policy "public_read_product_images" on product_images
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id and p.status = 'published'
    )
  );

create policy "public_read_sizes" on sizes
  for select
  using (is_active);

create policy "public_read_colors" on colors
  for select
  using (is_active);

create policy "public_read_outfits" on outfits
  for select
  using (status = 'published');

create policy "public_read_outfit_products" on outfit_products
  for select
  using (
    exists (
      select 1 from outfits o
      where o.id = outfit_products.outfit_id and o.status = 'published'
    )
    and exists (
      select 1 from products p
      where p.id = outfit_products.product_id and p.status = 'published'
    )
    and (
      outfit_products.variant_id is null
      or exists (
        select 1 from product_variants pv
        where pv.id = outfit_products.variant_id and pv.is_active
      )
    )
  );

-- Nota: product_variants NO tiene policy de lectura pública a propósito.
-- El público solo accede a variantes vía la vista storefront_product_variants.

-- ----------------------------------------------------------------------------
-- Administrador (authenticated + fila activa en admins): gestión de catálogo.
-- ----------------------------------------------------------------------------
create policy "admin_all_categories" on categories
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_products" on products
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_product_images" on product_images
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_sizes" on sizes
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_colors" on colors
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_variants" on product_variants
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_outfits" on outfits
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_all_outfit_products" on outfit_products
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- ----------------------------------------------------------------------------
-- Administrador: pedidos/clientes. Sin INSERT/DELETE -- el checkout crea
-- estas filas exclusivamente vía create_order_with_reservation (service-role).
-- ----------------------------------------------------------------------------
create policy "admin_read_customers" on customers
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_update_customers" on customers
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_read_orders" on orders
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_update_orders" on orders
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- order_items: solo lectura para admin -- es snapshot inmutable.
create policy "admin_read_order_items" on order_items
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- payments: solo lectura para admin -- el estado cambia únicamente vía
-- webhook validado (service-role), nunca por edición manual en el panel.
create policy "admin_read_payments" on payments
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- shipments: gestión logística legítima del admin (tracking, etiqueta, etc).
create policy "admin_all_shipments" on shipments
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- admins: cada admin lee solo su propia fila. Sin policy de insert/update:
-- el alta/baja de administradores se hace fuera de la API (service-role/SQL),
-- para que nadie pueda auto-promoverse a admin.
create policy "admin_read_self" on admins
  for select to authenticated
  using (id = auth.uid());

-- ============================================================================
-- GRANTS
-- El proyecto tiene desactivada la auto-exposición de tablas nuevas: hay que
-- otorgar privilegios explícitamente por tabla. service_role no requiere
-- GRANTs -- bypassa RLS y ya tiene privilegios amplios por defecto en Supabase.
-- ============================================================================

-- Catálogo público (solo lectura para anon/authenticated; la escritura de
-- verdad la habilita la RLS policy admin_* de arriba, no este GRANT).
grant select on
  categories, products, product_images, sizes, colors,
  outfits, outfit_products, storefront_product_variants
to anon, authenticated;

-- Gestión de catálogo (gateado por RLS admin_*).
grant select, insert, update, delete on
  categories, products, product_images, sizes, colors, product_variants,
  outfits, outfit_products
to authenticated;

-- Pedidos/clientes: sin insert/delete a nivel de grant (refuerza lo que ya
-- impone RLS -- ni siquiera un futuro cambio de policy abriría estas vías
-- sin también tocar el GRANT).
grant select, update on customers to authenticated;
grant select, update on orders to authenticated;
grant select on order_items to authenticated;
grant select on payments to authenticated;
grant select, insert, update, delete on shipments to authenticated;
grant select on admins to authenticated;
