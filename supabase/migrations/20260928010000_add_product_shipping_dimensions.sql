-- ============================================================================
-- GXK12.2 — Peso y dimensiones de producto para Shipping (PRO-127)
--
-- Nivel del dato: products, no product_variants. GXK12.2 es indumentaria
-- (remeras/buzos/pantalones) donde las variantes son combinaciones de
-- talle/color (ver product_variants) -- price_override y stock sí varían
-- por variante porque son atributos comerciales/de inventario reales por
-- SKU, pero el peso/dimensiones de una prenda son una característica del
-- diseño del producto (tela, corte), no del talle o color puntual: la
-- diferencia de peso entre un talle S y un XL de la misma prenda es
-- despreciable para cotizar un envío, y no hay ningún requerimiento de
-- Shipping (ver src/services/shipping/provider.ts, ShippingParcel) que
-- pida esa granularidad. Iría en product_variants solo si el catálogo
-- necesitara distinguir, por ejemplo, dos telas/materiales distintos como
-- variantes de un mismo producto -- no es el caso hoy. Guardarlo en
-- products evita duplicar el mismo dato en cada una de las variantes de un
-- producto.
--
-- Unidades explícitas en el nombre de columna (gramos/centímetros) en vez
-- de una columna de unidad en texto -- ver notas de la etapa.
-- ============================================================================

alter table products
  add column weight_grams integer,
  add column length_cm numeric,
  add column width_cm numeric,
  add column height_cm numeric;

-- Null = "sin datos físicos todavía" (no se inventan valores para el
-- catálogo existente). Shipping podrá distinguir esto de un 0 real, que
-- nunca es un valor físico válido -- por eso ninguno de los cuatro admite 0
-- ni negativos cuando está informado.
alter table products
  add constraint products_weight_grams_check check (weight_grams is null or weight_grams >= 0),
  add constraint products_length_cm_check check (length_cm is null or length_cm > 0),
  add constraint products_width_cm_check check (width_cm is null or width_cm > 0),
  add constraint products_height_cm_check check (height_cm is null or height_cm > 0);
