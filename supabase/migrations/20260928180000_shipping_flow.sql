-- ============================================================================
-- GXK12.2 — Flujo real de envíos (PRO-128)
--
-- 1. shipping_settings: configuración persistente (fila única) de envíos que
--    GXK edita desde Admin Web sin tocar código -- proveedor activo, costo
--    fijo de envío cobrado en checkout, service type y datos de despacho
--    (remitente/origen). Todo nullable: no se asume proveedor inicial, costo
--    ni origen -- mientras falten, el checkout se rechaza (ver
--    services/checkout) en vez de cobrar un envío inventado.
-- 2. shipments: estados explícitos + columnas para registrar la incidencia
--    cuando el proveedor falla (last_error/attempts/last_attempt_at), e
--    índice único parcial "un envío activo por pedido" que hace idempotente
--    la creación ante reintentos del webhook de Mercado Pago.
-- 3. GRANTs mínimos para service_role (webhook) y authenticated (admin).
--
-- Aditiva: no borra ni reescribe datos existentes (shipments estaba vacía al
-- escribir esta migración; igual el CHECK admite NULL -> ver abajo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- shipping_settings (singleton: id boolean = true)
-- ----------------------------------------------------------------------------
create table shipping_settings (
  id boolean primary key default true check (id),
  active_provider text check (active_provider is null or active_provider in ('andreani', 'correo_argentino')),
  -- Costo fijo que se cobra al comprador en checkout. Regla comercial
  -- definitiva pendiente de GXK (no hay cotización online verificada para
  -- ningún proveedor) -- se configura a mano.
  shipping_cost numeric(12, 2) check (shipping_cost is null or shipping_cost >= 0),
  -- Código de servicio del contrato con el proveedor (Correo Argentino lo
  -- exige: 2 letras, lo provee su área Comercial). Sin valor por defecto.
  service_type text,
  -- Domicilio de despacho de GXK (ShippingPostalAddress) y contacto del
  -- remitente (ShippingRecipient). Ambos proveedores los exigen para dar de
  -- alta un envío; GXK todavía no los definió.
  origin_address jsonb check (origin_address is null or jsonb_typeof(origin_address) = 'object'),
  origin_contact jsonb check (origin_contact is null or jsonb_typeof(origin_contact) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger trg_shipping_settings_updated_at
  before update on shipping_settings
  for each row execute function set_updated_at();

comment on table shipping_settings is
  'Configuración de envíos (fila única). Editable por admins activos desde Admin Web; leída server-side por checkout y por la creación de envíos post-pago.';

-- Fila única, vacía: no configura ningún valor de negocio.
insert into shipping_settings (id) values (true);

alter table shipping_settings enable row level security;

create policy "admin_read_shipping_settings" on shipping_settings
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

create policy "admin_update_shipping_settings" on shipping_settings
  for update to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active))
  with check (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

-- Sin insert/delete: la fila única ya existe y no se borra.
grant select, update on shipping_settings to authenticated;
-- service_role: checkout (costo/proveedor) y creación de envío post-pago.
grant select on shipping_settings to service_role;

-- ----------------------------------------------------------------------------
-- shipments: estados explícitos + incidencia
--
-- pending    -> fila creada, alta en el proveedor en curso
-- processing -> el proveedor aceptó el alta en forma asíncrona
-- created    -> el proveedor confirmó el alta (external_id/tracking)
-- failed     -> la alta falló (ver last_error); reintentable desde Admin
-- cancelled  -> cancelado (libera el índice único de envío activo)
-- ----------------------------------------------------------------------------
alter table shipments
  add constraint shipments_status_check
  check (status is null or status in ('pending', 'processing', 'created', 'failed', 'cancelled'));

alter table shipments
  add column last_error text,
  add column attempts integer not null default 0 check (attempts >= 0),
  add column last_attempt_at timestamptz;

comment on column shipments.last_error is
  'Último error al dar de alta el envío en el proveedor (incidencia). NULL si el último intento fue exitoso.';

-- Un solo envío activo por pedido: hace idempotente la creación post-pago
-- ante reintentos del webhook / clicks repetidos. Se mantiene la relación
-- 1:N (un envío cancelado no bloquea uno nuevo).
create unique index uq_shipments_order_active
  on shipments (order_id)
  where status is distinct from 'cancelled';

-- service_role (webhook de Mercado Pago -> ensureShipmentForPaidOrder) no
-- tenía ningún privilegio sobre shipments. Sin DELETE: nunca se borran.
-- (orders/order_items/customers/products ya tienen SELECT para service_role,
-- ver grant_service_role_checkout_permissions.)
grant select, insert, update on shipments to service_role;
