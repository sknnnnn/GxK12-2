-- ============================================================================
-- GXK12.2 — Corrección: privilegios de tabla/secuencia para service_role
--
-- Hallazgo (pruebas controladas sobre el esquema ya desplegado):
-- service_role NO tenía SELECT/INSERT/UPDATE/DELETE sobre las tablas que
-- create_order_with_reservation(...) y release_expired_stock_reservations()
-- necesitan tocar -- solo tenía el baseline REFERENCES/TRIGGER/TRUNCATE que
-- Supabase aplica por defecto a todo rol en tablas nuevas del schema public.
-- El supuesto original ("service_role bypassa RLS y ya tiene privilegios
-- amplios por defecto") era incorrecto para este proyecto: service_role
-- bypassa RLS, pero NO bypassa el sistema de GRANTs de Postgres.
--
-- Esta migración NO toca RLS, políticas, funciones ni tablas -- únicamente
-- agrega los GRANTs mínimos que las dos funciones ya desplegadas requieren
-- para poder ejecutarse, determinados leyendo línea por línea qué toca cada
-- una (ver desglose en el resumen que acompaña este archivo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers
-- create_order_with_reservation hace:
--   insert into customers (...) values (...)
--   on conflict (lower(email)) do update set ... returning id
-- INSERT ... ON CONFLICT DO UPDATE requiere tanto INSERT como UPDATE; el
-- camino de upsert y el RETURNING requieren además SELECT.
-- No se otorga DELETE: la función nunca borra clientes.
-- ----------------------------------------------------------------------------
grant select, insert, update on customers to service_role;

-- ----------------------------------------------------------------------------
-- orders
-- create_order_with_reservation: INSERT inicial (returning *) y luego un
-- UPDATE final de subtotal/total (returning *).
-- release_expired_stock_reservations: SELECT ... FOR UPDATE SKIP LOCKED
-- sobre pedidos pending_payment vencidos, y UPDATE para marcarlos cancelled.
-- FOR UPDATE exige privilegio UPDATE además de SELECT (no solo lectura).
-- No se otorga DELETE: ninguna de las dos funciones borra pedidos.
-- ----------------------------------------------------------------------------
grant select, insert, update on orders to service_role;

-- ----------------------------------------------------------------------------
-- order_items
-- create_order_with_reservation: INSERT del snapshot (product_name,
-- variant_label, sku, unit_price, quantity) -- sin RETURNING, no necesita
-- SELECT para esa parte.
-- release_expired_stock_reservations: hace
--   update product_variants pv set stock = pv.stock + oi.quantity
--     from order_items oi where oi.order_id = ... and oi.variant_id = pv.id
-- ese FROM order_items exige SELECT sobre order_items.
-- No se otorga UPDATE ni DELETE: ninguna de las dos funciones modifica ni
-- borra order_items una vez insertado (es snapshot inmutable, por diseño).
-- ----------------------------------------------------------------------------
grant select, insert on order_items to service_role;

-- ----------------------------------------------------------------------------
-- product_variants
-- create_order_with_reservation: SELECT ... FOR UPDATE OF pv (bloqueo de
-- fila, exige UPDATE ademas de SELECT) y luego
--   update product_variants set stock = stock - qty where ... and stock >= qty
-- release_expired_stock_reservations: UPDATE para reponer stock (arriba).
-- No se otorga INSERT ni DELETE: crear/borrar variantes es tarea del admin
-- (ya cubierto por la policy admin_all_variants + grants a authenticated),
-- no de estas dos funciones de checkout/liberación.
-- ----------------------------------------------------------------------------
grant select, update on product_variants to service_role;

-- ----------------------------------------------------------------------------
-- products
-- create_order_with_reservation lee p.name / p.price (join de solo lectura
-- para armar el snapshot de order_items). Ninguna escritura.
-- ----------------------------------------------------------------------------
grant select on products to service_role;

-- ----------------------------------------------------------------------------
-- sizes / colors
-- create_order_with_reservation lee s.name / c.name (join de solo lectura
-- para armar variant_label, ej. "M / Negro"). Ninguna escritura.
-- ----------------------------------------------------------------------------
grant select on sizes to service_role;
grant select on colors to service_role;

-- ----------------------------------------------------------------------------
-- Secuencia order_number_seq
-- El trigger set_order_number() (disparado en el INSERT a orders, corre con
-- los privilegios de quien ejecuta el INSERT -- service_role) llama
-- nextval('order_number_seq'). USAGE sobre la secuencia es un privilegio
-- separado del privilegio sobre la tabla orders y no se hereda de él.
-- Verificado antes de esta migración: has_sequence_privilege('service_role',
-- 'public.order_number_seq', 'USAGE') devolvía false.
-- ----------------------------------------------------------------------------
grant usage on sequence order_number_seq to service_role;

-- ============================================================================
-- Deliberadamente SIN cambios (documentado para que quede explícito):
--
-- - payments, shipments, categories, admins, outfits, outfit_products,
--   product_images: ninguna de las dos funciones los toca. No se otorga
--   ningún privilegio sobre ellos en esta migración.
-- - DELETE: no se otorga en ninguna tabla -- ninguna de las dos funciones
--   borra filas.
-- - INSERT en product_variants: no se otorga -- crear variantes es tarea
--   administrativa, no de checkout/liberación.
-- - anon / authenticated: sin cambios. Siguen sin EXECUTE sobre
--   create_order_with_reservation ni release_expired_stock_reservations
--   (ya revocado explícitamente en la migración inicial), y sus GRANTs de
--   tabla existentes no se tocan acá.
-- ============================================================================
