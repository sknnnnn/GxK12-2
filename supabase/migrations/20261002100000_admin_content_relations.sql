-- ============================================================================
-- Admin Control — Fase A: relaciones editoriales y consulta de miembros.
--
-- * universe_entries.has_page: una entrada publicada puede existir solo como
--   contexto (p. ej. una temporada o una colaboración) sin página pública
--   propia. Default true: el comportamiento actual no cambia.
-- * events.extra_info: "información adicional" del evento. GXK informa cómo
--   participar; no hay RSVP, tickets ni registro de participantes.
-- * Relaciones N:N opcionales, sin jerarquía (Season/Campaign/Production/
--   Collaboration/Universe, capítulos de Las Aventuras de G & K, eventos,
--   productos y outfits). Las relaciones de G & K van a nivel capítulo (la
--   unidad con página); `adventures` sigue siendo el contenido del capítulo.
-- * admin_member_lookup: búsqueda de miembros (solo lectura) para Admin.
--
-- RLS de las relaciones: una fila es visible solo si ambos extremos son
-- visibles para quien consulta (las subconsultas respetan la RLS de cada
-- tabla: publicado, Members Only, early access, admin). Escritura: admin.
-- ============================================================================

alter table universe_entries add column has_page boolean not null default true;
alter table events add column extra_info text;

-- Universe <-> Universe (simétrica: cada par se guarda una sola vez).
create table universe_entry_relations (
  entry_id uuid not null references universe_entries (id) on delete cascade,
  related_entry_id uuid not null references universe_entries (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (entry_id, related_entry_id),
  constraint chk_universe_entry_relations_order check (entry_id < related_entry_id)
);
create index idx_universe_entry_relations_related on universe_entry_relations (related_entry_id);

-- Capítulo de G & K <-> Universe / productos / outfits.
create table adventure_chapter_entries (
  chapter_id uuid not null references adventure_chapters (id) on delete cascade,
  entry_id uuid not null references universe_entries (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (chapter_id, entry_id)
);
create index idx_adventure_chapter_entries_entry on adventure_chapter_entries (entry_id);

create table adventure_chapter_products (
  chapter_id uuid not null references adventure_chapters (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (chapter_id, product_id)
);
create index idx_adventure_chapter_products_product on adventure_chapter_products (product_id);

create table adventure_chapter_outfits (
  chapter_id uuid not null references adventure_chapters (id) on delete cascade,
  outfit_id uuid not null references outfits (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (chapter_id, outfit_id)
);
create index idx_adventure_chapter_outfits_outfit on adventure_chapter_outfits (outfit_id);

-- Evento <-> Universe / capítulos / productos / outfits.
create table event_entries (
  event_id uuid not null references events (id) on delete cascade,
  entry_id uuid not null references universe_entries (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (event_id, entry_id)
);
create index idx_event_entries_entry on event_entries (entry_id);

create table event_adventure_chapters (
  event_id uuid not null references events (id) on delete cascade,
  chapter_id uuid not null references adventure_chapters (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (event_id, chapter_id)
);
create index idx_event_adventure_chapters_chapter on event_adventure_chapters (chapter_id);

create table event_products (
  event_id uuid not null references events (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (event_id, product_id)
);
create index idx_event_products_product on event_products (product_id);

create table event_outfits (
  event_id uuid not null references events (id) on delete cascade,
  outfit_id uuid not null references outfits (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (event_id, outfit_id)
);
create index idx_event_outfits_outfit on event_outfits (outfit_id);

alter table universe_entry_relations enable row level security;
alter table adventure_chapter_entries enable row level security;
alter table adventure_chapter_products enable row level security;
alter table adventure_chapter_outfits enable row level security;
alter table event_entries enable row level security;
alter table event_adventure_chapters enable row level security;
alter table event_products enable row level security;
alter table event_outfits enable row level security;

create policy "read_universe_entry_relations" on universe_entry_relations for select using (
  exists (select 1 from universe_entries e where e.id = entry_id)
  and exists (select 1 from universe_entries e where e.id = related_entry_id)
);
create policy "read_adventure_chapter_entries" on adventure_chapter_entries for select using (
  exists (select 1 from adventure_chapters c where c.id = chapter_id)
  and exists (select 1 from universe_entries e where e.id = entry_id)
);
create policy "read_adventure_chapter_products" on adventure_chapter_products for select using (
  exists (select 1 from adventure_chapters c where c.id = chapter_id)
  and exists (select 1 from products p where p.id = product_id)
);
create policy "read_adventure_chapter_outfits" on adventure_chapter_outfits for select using (
  exists (select 1 from adventure_chapters c where c.id = chapter_id)
  and exists (select 1 from outfits o where o.id = outfit_id)
);
create policy "read_event_entries" on event_entries for select using (
  exists (select 1 from events v where v.id = event_id)
  and exists (select 1 from universe_entries e where e.id = entry_id)
);
create policy "read_event_adventure_chapters" on event_adventure_chapters for select using (
  exists (select 1 from events v where v.id = event_id)
  and exists (select 1 from adventure_chapters c where c.id = chapter_id)
);
create policy "read_event_products" on event_products for select using (
  exists (select 1 from events v where v.id = event_id)
  and exists (select 1 from products p where p.id = product_id)
);
create policy "read_event_outfits" on event_outfits for select using (
  exists (select 1 from events v where v.id = event_id)
  and exists (select 1 from outfits o where o.id = outfit_id)
);

create policy "admin_all_universe_entry_relations" on universe_entry_relations for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventure_chapter_entries" on adventure_chapter_entries for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventure_chapter_products" on adventure_chapter_products for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_adventure_chapter_outfits" on adventure_chapter_outfits for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_event_entries" on event_entries for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_event_adventure_chapters" on event_adventure_chapters for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_event_products" on event_products for all to authenticated
  using (is_active_admin()) with check (is_active_admin());
create policy "admin_all_event_outfits" on event_outfits for all to authenticated
  using (is_active_admin()) with check (is_active_admin());

grant select on
  universe_entry_relations, adventure_chapter_entries, adventure_chapter_products, adventure_chapter_outfits,
  event_entries, event_adventure_chapters, event_products, event_outfits
to anon, authenticated, service_role;

grant insert, update, delete on
  universe_entry_relations, adventure_chapter_entries, adventure_chapter_products, adventure_chapter_outfits,
  event_entries, event_adventure_chapters, event_products, event_outfits
to authenticated;

-- ----------------------------------------------------------------------------
-- Familia GxK: búsqueda de miembros para Admin (solo lectura, no es un CRM).
-- El email vive en auth.users, que Admin no lee directamente. Busca por
-- email o nombre (sin comodines: position, no LIKE). Pedidos y beneficios se
-- leen aparte con la RLS admin existente.
-- ----------------------------------------------------------------------------
create or replace function admin_member_lookup(p_query text)
returns table (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz,
  email_confirmed boolean,
  confirmed_purchases integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
begin
  if not is_active_admin() then
    raise exception 'not_admin';
  end if;
  if char_length(v_query) < 2 then
    return;
  end if;
  return query
    select m.user_id,
           u.email::text,
           m.first_name,
           m.last_name,
           m.phone,
           m.created_at,
           u.email_confirmed_at is not null,
           camino_confirmed_count(m.user_id)
      from member_profiles m
      join auth.users u on u.id = m.user_id
     where position(v_query in lower(u.email)) > 0
        or position(v_query in lower(m.first_name || ' ' || m.last_name)) > 0
     order by m.created_at desc
     limit 20;
end;
$$;

revoke all on function admin_member_lookup from public, anon;
grant execute on function admin_member_lookup to authenticated;
