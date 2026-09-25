-- ============================================================================
-- GXK12.2 — Corrección: privilegios de tabla para service_role sobre
-- catálogo (categories/products/product_variants/product_images/sizes/colors)
--
-- Hallazgo (al intentar correr scripts/seed-test-catalog.mjs con el cliente
-- admin/service-role): igual que se detectó antes para las funciones de
-- checkout, service_role solo tenía el baseline
-- REFERENCES/TRIGGER/TRUNCATE en estas tablas -- sin SELECT/INSERT/UPDATE/
-- DELETE reales. La migración de grants anterior
-- (20260925160019_grant_service_role_checkout_permissions.sql) cubrió
-- exactamente lo que create_order_with_reservation/
-- release_expired_stock_reservations tocan; ninguna de esas dos funciones
-- escribe en catálogo, así que ese gap quedó sin cubrir a propósito.
--
-- Esta migración agrega el mínimo necesario para que un proceso
-- server-only con service-role (ej. este seed de datos TEST, o en el
-- futuro un endpoint de administración de catálogo) pueda crear/actualizar/
-- borrar filas de catálogo. No toca RLS ni políticas -- son privilegios de
-- GRANT de Postgres, una capa distinta y complementaria a RLS.
-- ============================================================================

-- categories: sin ningún privilegio real todavía (el seed necesita crear
-- categorías TEST, leerlas de vuelta tras insertarlas, y poder limpiarlas).
grant select, insert, delete on categories to service_role;

-- products: ya tenía SELECT (usado por create_order_with_reservation).
-- Agrega INSERT/DELETE para poder crear y limpiar productos TEST.
grant insert, delete on products to service_role;

-- product_variants: ya tenía SELECT/UPDATE (stock, checkout). Agrega
-- INSERT para poder crear variantes al sembrar productos TEST. Sin DELETE:
-- se limpian por cascada al borrar el producto padre (ON DELETE CASCADE
-- no requiere privilegio DELETE separado sobre la tabla hija en Postgres).
grant insert on product_variants to service_role;

-- product_images: sin ningún privilegio real todavía. Agrega INSERT para
-- poder registrar las imágenes subidas a Storage. Mismo razonamiento de
-- cascada que product_variants: sin DELETE explícito.
grant insert on product_images to service_role;

-- sizes / colors: ya tenían SELECT. Agrega INSERT + UPDATE porque el seed
-- los crea vía upsert (INSERT ... ON CONFLICT DO UPDATE), que requiere
-- ambos privilegios.
grant insert, update on sizes to service_role;
grant insert, update on colors to service_role;
