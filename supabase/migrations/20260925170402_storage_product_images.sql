-- ============================================================================
-- GXK12.2 — Storage: bucket público de imágenes de producto
--
-- No modifica ninguna tabla de catálogo ni las migraciones históricas.
-- Resuelve el placeholder PRODUCT_IMAGES_BUCKET = "product-images" que ya
-- usa src/services/catalog/index.ts (getProductImageUrl vía
-- supabase.storage.from(...).getPublicUrl(...)).
--
-- Modelo: bucket público (lectura directa vía el endpoint público de
-- Storage, sin pasar por RLS) + RLS en storage.objects para todo lo demás:
--   - Lectura (SELECT): pública, coherente con la lectura pública ya
--     otorgada en las tablas de catálogo.
--   - Escritura (INSERT/UPDATE/DELETE): exclusiva para administradores
--     autenticados (misma verificación que las policies admin_* del resto
--     del esquema: fila activa en public.admins). anon no tiene ninguna de
--     estas tres.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active)
  );

create policy "product_images_admin_update"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active)
  )
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active)
  );

create policy "product_images_admin_delete"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.id = auth.uid() and a.is_active)
  );
