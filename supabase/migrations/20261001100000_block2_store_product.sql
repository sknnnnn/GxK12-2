-- ============================================================================
-- Bloque 2 — Tienda + Producto (Roadmap). Fuente: Brand & E-commerce Bible.
--
-- * products.product_type / composition: la ficha debe mostrar "tipo" y
--   "composición" (Bible §16). El tipo además hace que los nombres japoneses
--   no perjudiquen la búsqueda (Bible §38.8).
-- * product_measurements: medidas reales por modelo y talle (Bible §20:
--   "Cada modelo tiene medidas propias... Mostrar: ancho, largo, hombros,
--   etc."). La etiqueta es libre (ancho/largo/hombros/...) porque la Bible
--   no cierra la lista.
-- * site_settings: configuración pública editable desde Admin (fila única).
--   Acá solo lo que el Bloque 2 necesita: WhatsApp contextual (Bible §22) y
--   enlaces a redes (Bible §35). Todo NULL = no definido, no se muestra.
-- ============================================================================

alter table products
  add column product_type text,
  add column composition text;

comment on column products.product_type is 'Tipo de prenda (Bible §16), ej. remera, buzo. También indexa la búsqueda.';
comment on column products.composition is 'Composición del tejido (Bible §16).';

-- ----------------------------------------------------------------------------
-- PRODUCT_MEASUREMENTS
-- ----------------------------------------------------------------------------
create table product_measurements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  -- NULL = producto sin talles (medida única).
  size_id uuid references sizes (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  value_cm numeric(6, 1) not null check (value_cm > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index uq_product_measurements on product_measurements (
  product_id,
  coalesce(size_id, '00000000-0000-0000-0000-000000000000'),
  lower(label)
);
create index idx_product_measurements_product on product_measurements (product_id, sort_order);

comment on table product_measurements is 'Medidas reales por producto y talle (cm). Bible §20.';

alter table product_measurements enable row level security;

create policy "public_read_product_measurements" on product_measurements
  for select
  using (
    exists (
      select 1 from products p
      where p.id = product_measurements.product_id and p.status = 'published'
    )
  );

create policy "admin_all_product_measurements" on product_measurements
  for all to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on product_measurements to anon, authenticated;
grant select, insert, update, delete on product_measurements to authenticated;
grant select on product_measurements to service_role;

-- ----------------------------------------------------------------------------
-- SITE_SETTINGS (fila única, pública)
-- ----------------------------------------------------------------------------
create table site_settings (
  id boolean primary key default true check (id),
  -- Número internacional sin "+" ni espacios (formato wa.me), ej. 5491122334455.
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^[0-9]{8,15}$'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https://'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~ '^https://'),
  updated_at timestamptz not null default now()
);

create trigger trg_site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

insert into site_settings (id) values (true);

comment on table site_settings is 'Configuración pública del sitio (fila única), editable por admins. NULL = no definido.';

alter table site_settings enable row level security;

create policy "public_read_site_settings" on site_settings
  for select
  using (true);

create policy "admin_update_site_settings" on site_settings
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on site_settings to anon, authenticated, service_role;
grant update on site_settings to authenticated;
