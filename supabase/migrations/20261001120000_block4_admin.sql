-- ============================================================================
-- Bloque 4 — Admin (Roadmap): GXK puede operar sin developer (Bible §34,
-- §38.11 "GXK gestiona contenido sin código").
--
-- * manual_sales + admin_record_manual_sale: ventas por Instagram / WhatsApp
--   / eventos / presencial se descuentan manualmente desde Admin (Bible §17).
-- * site_settings: contenido editable de Home (hero, textos de secciones),
--   Nosotros (Bible §30) y Help (Bible §31).
-- * outfits.style: estilos de Ideas de outfits (Bible §12).
-- * Modelo del Universo (Bible §26-§29), gestionado desde Admin y publicado
--   en el Bloque 5: universe_entries (campañas, producciones, temporadas,
--   colaboraciones, audiovisual) con productos y outfits asociados;
--   Las Aventuras de G & K como temporadas -> capítulos -> aventuras; eventos
--   (showrooms, colaboraciones, eventos, experiencias) que después pasan a
--   archivo. Todo arranca vacío o en borrador: no se inventa contenido.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ventas manuales por canal (Bible §17)
-- ----------------------------------------------------------------------------
create table manual_sales (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  quantity integer not null check (quantity > 0),
  channel text not null check (channel in ('instagram', 'whatsapp', 'evento', 'presencial')),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_manual_sales_created on manual_sales (created_at desc);

alter table manual_sales enable row level security;

create policy "admin_read_manual_sales" on manual_sales
  for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid() and a.is_active));

grant select on manual_sales to authenticated;

create or replace function admin_record_manual_sale(
  p_variant_id uuid,
  p_quantity integer,
  p_channel text,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant record;
  v_remaining integer;
begin
  if not is_active_admin() then
    raise exception 'not_allowed';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  select pv.id, p.name as product_name, nullif(concat_ws(' / ', s.name, c.name), '') as label
    into v_variant
    from product_variants pv
    join products p on p.id = pv.product_id
    left join sizes s on s.id = pv.size_id
    left join colors c on c.id = pv.color_id
   where pv.id = p_variant_id;
  if v_variant is null then
    raise exception 'variant_not_found';
  end if;

  -- Mismo descuento atómico condicional que las ventas online.
  update product_variants
     set stock = stock - p_quantity
   where id = p_variant_id and stock >= p_quantity
   returning stock into v_remaining;
  if not found then
    raise exception 'insufficient_stock';
  end if;

  insert into manual_sales (variant_id, product_name, variant_label, quantity, channel, note, created_by)
  values (p_variant_id, v_variant.product_name, v_variant.label, p_quantity, p_channel, nullif(trim(p_note), ''), auth.uid());

  return v_remaining;
end;
$$;

revoke all on function admin_record_manual_sale from public;
grant execute on function admin_record_manual_sale to authenticated;

-- ----------------------------------------------------------------------------
-- Contenido editable del sitio
-- ----------------------------------------------------------------------------
alter table site_settings
  add column hero_image_path text,
  add column hero_image_alt text,
  add column universo_description text,
  add column gk_description text,
  add column members_description text,
  add column about_body text,
  add column help_body text;

comment on column site_settings.about_body is 'Nosotros (Bible §30): qué es GXK, por qué existe, significado de GXK y 12:2, G/K, filosofía.';
comment on column site_settings.help_body is 'Help (Bible §31): cómo comprar, FAQ y lo que GXK quiera sumar a lo ya definido por la Bible.';

-- ----------------------------------------------------------------------------
-- Estilos de outfits (Bible §12)
-- ----------------------------------------------------------------------------
alter table outfits
  add column style text check (style is null or style in ('street', 'formal', 'japanese', 'y2k', 'workwear'));

-- ----------------------------------------------------------------------------
-- UNIVERSO GXK 12:2 (Bible §26-§27)
-- ----------------------------------------------------------------------------
create table universe_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('campaign', 'production', 'season', 'collaboration', 'audiovisual')),
  title text not null,
  slug text not null unique,
  summary text,
  -- Historia (Bible §27: una campaña puede tener historia, foto, video, producto).
  body text,
  cover_path text,
  video_url text check (video_url is null or video_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  -- Contenido exclusivo de Members Only (Bible §24); ver Bloque 6.
  members_only boolean not null default false,
  published_at timestamptz not null default now(),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_universe_entries_public on universe_entries (status, kind, published_at desc);

create trigger trg_universe_entries_updated_at
  before update on universe_entries
  for each row execute function set_updated_at();

create table universe_entry_media (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references universe_entries (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_universe_entry_media_entry on universe_entry_media (entry_id, sort_order);

-- Productos comprables desde la campaña si hay stock (Bible §27). La
-- entrada sigue existiendo aunque el producto se agote (Bible §26).
create table universe_entry_products (
  entry_id uuid not null references universe_entries (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (entry_id, product_id)
);

create table universe_entry_outfits (
  entry_id uuid not null references universe_entries (id) on delete cascade,
  outfit_id uuid not null references outfits (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (entry_id, outfit_id)
);

-- ----------------------------------------------------------------------------
-- LAS AVENTURAS DE G & K (Bible §28): Temporadas -> capítulos -> aventuras.
-- ----------------------------------------------------------------------------
create table adventure_seasons (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  title text not null,
  slug text not null unique,
  summary text,
  cover_path text,
  -- coming_soon: se anuncia sin contenido (Bible: "Season 02: coming soon").
  status text not null default 'draft' check (status in ('draft', 'published', 'coming_soon', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_adventure_seasons_updated_at
  before update on adventure_seasons
  for each row execute function set_updated_at();

create table adventure_chapters (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references adventure_seasons (id) on delete cascade,
  -- Etiqueta de la Bible: "Prólogo", "Ch.1", "Final".
  label text not null,
  title text,
  slug text not null,
  summary text,
  cover_path text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, slug)
);

create index idx_adventure_chapters_season on adventure_chapters (season_id, sort_order);

create trigger trg_adventure_chapters_updated_at
  before update on adventure_chapters
  for each row execute function set_updated_at();

create table adventures (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references adventure_chapters (id) on delete cascade,
  title text not null,
  body text,
  cover_path text,
  video_url text check (video_url is null or video_url ~ '^https://'),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_adventures_chapter on adventures (chapter_id, sort_order);

create trigger trg_adventures_updated_at
  before update on adventures
  for each row execute function set_updated_at();

-- Estructura de la Season 01 definida literalmente por la Bible §28. Queda
-- en BORRADOR: el admin completa y publica. Ningún texto adicional.
with season as (
  insert into adventure_seasons (number, title, slug, status)
  values (1, 'LA BÚSQUEDA DEL OUTFIT IDEAL', 'season-01', 'draft')
  returning id
)
insert into adventure_chapters (season_id, label, title, slug, sort_order)
select season.id, c.label, c.title, c.slug, c.ord
  from season,
       (values
         ('Prólogo', null, 'prologo', 0),
         ('Ch.1', 'Shitsurei', 'ch-1-shitsurei', 1),
         ('Ch.2', 'Shinobi', 'ch-2-shinobi', 2),
         ('Ch.3', 'Multiverso', 'ch-3-multiverso', 3),
         ('Ch.4', 'La cuarta estrella', 'ch-4-la-cuarta-estrella', 4),
         ('Ch.5', 'Rokkā', 'ch-5-rokka', 5),
         ('Ch.6', 'Ame', 'ch-6-ame', 6),
         ('Ch.7', 'Omakase', 'ch-7-omakase', 7),
         ('Final', 'Pirámide', 'final-piramide', 8)
       ) as c(label, title, slug, ord);

insert into adventure_seasons (number, title, slug, status)
values (2, 'Season 02', 'season-02', 'draft');

-- ----------------------------------------------------------------------------
-- EVENTOS (Bible §29): showrooms, colaboraciones, eventos, experiencias.
-- Con fecha, lugar, horario, descripción, participación. Después pasan a
-- archivo (derivado de la fecha, no un estado manual).
-- ----------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('showroom', 'collaboration', 'event', 'experience')),
  title text not null,
  slug text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz,
  place text,
  -- Horario tal como lo quiera comunicar GXK (además de starts/ends).
  schedule text,
  description text,
  participation text,
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  members_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_events_dates check (ends_at is null or ends_at >= starts_at)
);

create index idx_events_public on events (status, starts_at);

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: público lee lo publicado (y no exclusivo de miembros); admin todo.
-- ----------------------------------------------------------------------------
alter table universe_entries enable row level security;
alter table universe_entry_media enable row level security;
alter table universe_entry_products enable row level security;
alter table universe_entry_outfits enable row level security;
alter table adventure_seasons enable row level security;
alter table adventure_chapters enable row level security;
alter table adventures enable row level security;
alter table events enable row level security;

create policy "public_read_universe_entries" on universe_entries
  for select using (status = 'published' and not members_only);
create policy "public_read_universe_entry_media" on universe_entry_media
  for select using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and not e.members_only));
create policy "public_read_universe_entry_products" on universe_entry_products
  for select using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and not e.members_only));
create policy "public_read_universe_entry_outfits" on universe_entry_outfits
  for select using (exists (select 1 from universe_entries e where e.id = entry_id and e.status = 'published' and not e.members_only));
create policy "public_read_adventure_seasons" on adventure_seasons
  for select using (status in ('published', 'coming_soon'));
create policy "public_read_adventure_chapters" on adventure_chapters
  for select using (
    status = 'published'
    and exists (select 1 from adventure_seasons s where s.id = season_id and s.status = 'published')
  );
create policy "public_read_adventures" on adventures
  for select using (
    status = 'published'
    and exists (
      select 1 from adventure_chapters c join adventure_seasons s on s.id = c.season_id
       where c.id = chapter_id and c.status = 'published' and s.status = 'published'
    )
  );
create policy "public_read_events" on events
  for select using (status = 'published' and not members_only);

create policy "admin_all_universe_entries" on universe_entries for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_universe_entry_media" on universe_entry_media for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_universe_entry_products" on universe_entry_products for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_universe_entry_outfits" on universe_entry_outfits for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventure_seasons" on adventure_seasons for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventure_chapters" on adventure_chapters for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventures" on adventures for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_events" on events for all to authenticated
  using (is_active_admin()) with check (is_active_admin());

grant select on
  universe_entries, universe_entry_media, universe_entry_products, universe_entry_outfits,
  adventure_seasons, adventure_chapters, adventures, events
to anon, authenticated, service_role;

grant insert, update, delete on
  universe_entries, universe_entry_media, universe_entry_products, universe_entry_outfits,
  adventure_seasons, adventure_chapters, adventures, events
to authenticated;
