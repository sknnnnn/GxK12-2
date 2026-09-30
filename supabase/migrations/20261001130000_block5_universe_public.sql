-- ============================================================================
-- Bloque 5 — Universo (público).
--
-- FIX: la policy pública de outfit_products consultaba product_variants,
-- sobre la que anon/authenticated no tienen SELECT (a propósito: el stock no
-- es público). Postgres valida ese permiso al planificar, así que apenas
-- existía un outfit publicado la lectura pública de outfits fallaba con
-- "permission denied for table product_variants". Se reemplaza la subconsulta
-- por una función SECURITY DEFINER que solo responde si la variante está
-- activa (no expone stock ni ningún otro dato).
-- ============================================================================

create or replace function is_variant_active(p_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from product_variants where id = p_variant_id and is_active);
$$;

revoke all on function is_variant_active from public;
grant execute on function is_variant_active to anon, authenticated, service_role;

drop policy "public_read_outfit_products" on outfit_products;

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
    and (outfit_products.variant_id is null or is_variant_active(outfit_products.variant_id))
  );
