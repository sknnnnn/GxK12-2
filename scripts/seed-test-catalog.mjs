// ============================================================================
// GXK12.2 — Seed de catálogo TEST/DEMO
//
// Carga un dataset pequeño y claramente identificado como TEST para validar
// el recorrido Storage → services/catalog → Storefront con datos reales,
// SIN hacerlo pasar por catálogo comercial de GXK.
//
// - Categorías y productos: nombre/slug prefijados "TEST " / "test-".
// - Talles y colores: SIN prefijo TEST a propósito — son catálogo de
//   referencia genérico (S/M/L/XL, Negro/Blanco/Gris) que el catálogo
//   comercial real va a reutilizar tal cual; no son "contenido" de prueba.
//   Por eso `--clean` no los borra (ver abajo).
// - Imágenes: SVGs mínimos generados localmente en este mismo script (sin
//   URLs externas, sin descargas), subidos a Storage bajo el prefijo
//   `test/` del bucket product-images.
//
// USO
//   Cargar el dataset:
//     node --env-file=.env.local scripts/seed-test-catalog.mjs
//
//   Limpiar el dataset TEST (categorías, productos, variantes, imágenes y
//   los objetos de Storage bajo test/ — NO borra sizes/colors, ver arriba):
//     node --env-file=.env.local scripts/seed-test-catalog.mjs --clean
//
// Usa SUPABASE_SERVICE_ROLE_KEY de .env.local (nunca la imprime). Requiere
// Node 20.6+ por --env-file. No se agregó ninguna dependencia nueva: solo
// usa @supabase/supabase-js, ya presente en package.json.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Ejecutá con: node --env-file=.env.local scripts/seed-test-catalog.mjs",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "product-images";
const STORAGE_PREFIX = "test/";

const CLEAN_ONLY = process.argv.includes("--clean");

// ----------------------------------------------------------------------------
// Assets mínimos de prueba: SVG generado localmente, sin dependencias.
// ----------------------------------------------------------------------------
function buildPlaceholderSvg(label, bgColor, fgColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${bgColor}"/>
  <text x="400" y="470" font-family="sans-serif" font-size="56" font-weight="bold" fill="${fgColor}" text-anchor="middle">TEST</text>
  <text x="400" y="540" font-family="sans-serif" font-size="26" fill="${fgColor}" text-anchor="middle">${label}</text>
</svg>`;
}

async function uploadPlaceholder(path, label, bgColor, fgColor) {
  const svg = buildPlaceholderSvg(label, bgColor, fgColor);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(STORAGE_PREFIX + path, new Blob([svg], { type: "image/svg+xml" }), {
      contentType: "image/svg+xml",
      upsert: true,
    });
  if (error) throw new Error(`Storage upload falló para ${path}: ${error.message}`);
  return STORAGE_PREFIX + path;
}

// ----------------------------------------------------------------------------
// Limpieza: borra únicamente lo TEST (categorías/productos con slug
// 'test-%', lo que cascadea variantes e imágenes vía FK), y los objetos de
// Storage bajo test/. No toca sizes/colors (ver nota de cabecera).
// ----------------------------------------------------------------------------
async function cleanTestData() {
  const { data: existingObjects, error: listError } = await supabase.storage.from(BUCKET).list("test");
  if (listError) throw new Error(`No se pudo listar Storage: ${listError.message}`);
  if (existingObjects && existingObjects.length > 0) {
    const paths = existingObjects.map((obj) => `${STORAGE_PREFIX}${obj.name}`);
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) throw new Error(`No se pudieron borrar objetos de Storage: ${removeError.message}`);
    console.log(`Storage: ${paths.length} objeto(s) TEST eliminado(s).`);
  } else {
    console.log("Storage: sin objetos TEST previos.");
  }

  const { error: productsError, count } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .like("slug", "test-%");
  if (productsError) throw new Error(`No se pudieron borrar productos TEST: ${productsError.message}`);
  console.log(`products: ${count ?? 0} fila(s) TEST eliminada(s) (cascada a product_variants/product_images).`);

  const { error: categoriesError, count: catCount } = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .like("slug", "test-%");
  if (categoriesError) throw new Error(`No se pudieron borrar categorías TEST: ${categoriesError.message}`);
  console.log(`categories: ${catCount ?? 0} fila(s) TEST eliminada(s).`);
}

// ----------------------------------------------------------------------------
// Seed
// ----------------------------------------------------------------------------
async function upsertSizes() {
  const rows = [
    { name: "S", sort_order: 1 },
    { name: "M", sort_order: 2 },
    { name: "L", sort_order: 3 },
    { name: "XL", sort_order: 4 },
  ];
  const { data, error } = await supabase.from("sizes").upsert(rows, { onConflict: "name" }).select("id, name");
  if (error) throw new Error(`sizes upsert falló: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.name, row.id]));
}

async function upsertColors() {
  const rows = [
    { name: "Negro", slug: "negro", hex_code: "#000000" },
    { name: "Blanco", slug: "blanco", hex_code: "#FFFFFF" },
    { name: "Gris", slug: "gris", hex_code: "#808080" },
  ];
  const { data, error } = await supabase.from("colors").upsert(rows, { onConflict: "slug" }).select("id, name");
  if (error) throw new Error(`colors upsert falló: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.name, row.id]));
}

async function insertCategories() {
  const rows = [
    { name: "TEST Remeras", slug: "test-remeras", is_active: true, sort_order: 1 },
    { name: "TEST Buzos", slug: "test-buzos", is_active: true, sort_order: 2 },
    { name: "TEST Pantalones", slug: "test-pantalones", is_active: true, sort_order: 3 },
  ];
  const { data, error } = await supabase.from("categories").insert(rows).select("id, slug");
  if (error) throw new Error(`categories insert falló: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.slug, row.id]));
}

async function insertProduct(row) {
  const { data, error } = await supabase.from("products").insert(row).select("id, slug").single();
  if (error) throw new Error(`products insert falló (${row.slug}): ${error.message}`);
  return data.id;
}

async function insertVariants(rows) {
  const { error } = await supabase.from("product_variants").insert(rows);
  if (error) throw new Error(`product_variants insert falló: ${error.message}`);
}

async function insertImage({ productId, storagePath, altText, sortOrder, isPrimary }) {
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: altText,
    sort_order: sortOrder,
    is_primary: isPrimary,
  });
  if (error) throw new Error(`product_images insert falló: ${error.message}`);
}

async function seed() {
  console.log("Limpiando dataset TEST previo (idempotencia)...");
  await cleanTestData();

  console.log("Creando talles y colores de referencia (sizes/colors)...");
  const sizeIds = await upsertSizes();
  const colorIds = await upsertColors();

  console.log("Creando categorías TEST...");
  const categoryIds = await insertCategories();

  console.log("Creando productos TEST...");

  // 1. Varias tallas y colores + destacado + una variante agotada dentro de
  //    un producto con stock. NO existe L+Blanco (combinación inexistente
  //    a propósito, para probar el selector).
  const remeraMultitalleId = await insertProduct({
    category_id: categoryIds["test-remeras"],
    name: "TEST Remera Multitalle",
    slug: "test-remera-multitalle",
    description: "Producto de prueba (TEST/DEMO). No es catálogo comercial real.",
    price: 15000,
    status: "published",
    is_featured: true,
  });
  await insertVariants([
    { product_id: remeraMultitalleId, size_id: sizeIds.S, color_id: colorIds.Negro, sku: "TEST-RM-S-NEG", stock: 5, is_active: true },
    { product_id: remeraMultitalleId, size_id: sizeIds.M, color_id: colorIds.Negro, sku: "TEST-RM-M-NEG", stock: 3, is_active: true },
    { product_id: remeraMultitalleId, size_id: sizeIds.M, color_id: colorIds.Blanco, sku: "TEST-RM-M-BLA", stock: 0, is_active: true },
    { product_id: remeraMultitalleId, size_id: sizeIds.L, color_id: colorIds.Negro, sku: "TEST-RM-L-NEG", stock: 2, is_active: true },
  ]);
  const remeraImg1 = await uploadPlaceholder("remera-multitalle-1.svg", "Remera Multitalle", "#171717", "#ffffff");
  const remeraImg2 = await uploadPlaceholder("remera-multitalle-2.svg", "Remera Multitalle (2)", "#333333", "#ffffff");
  await insertImage({ productId: remeraMultitalleId, storagePath: remeraImg1, altText: "TEST Remera Multitalle", sortOrder: 1, isPrimary: true });
  await insertImage({ productId: remeraMultitalleId, storagePath: remeraImg2, altText: "TEST Remera Multitalle, vista 2", sortOrder: 2, isPrimary: false });

  // 2. Solo dimensión talle (sin color) + una variante agotada.
  const buzoSoloTallesId = await insertProduct({
    category_id: categoryIds["test-buzos"],
    name: "TEST Buzo Solo Talles",
    slug: "test-buzo-solo-talles",
    description: "Producto de prueba (TEST/DEMO). Solo varía por talle.",
    price: 22000,
    status: "published",
    is_featured: false,
  });
  await insertVariants([
    { product_id: buzoSoloTallesId, size_id: sizeIds.S, color_id: null, sku: "TEST-BST-S", stock: 4, is_active: true },
    { product_id: buzoSoloTallesId, size_id: sizeIds.M, color_id: null, sku: "TEST-BST-M", stock: 6, is_active: true },
    { product_id: buzoSoloTallesId, size_id: sizeIds.L, color_id: null, sku: "TEST-BST-L", stock: 0, is_active: true },
  ]);
  const buzoImg = await uploadPlaceholder("buzo-solo-talles-1.svg", "Buzo Solo Talles", "#2b4c3f", "#ffffff");
  await insertImage({ productId: buzoSoloTallesId, storagePath: buzoImg, altText: "TEST Buzo Solo Talles", sortOrder: 1, isPrimary: true });

  // 3. Disponible, simple.
  const pantalonDisponibleId = await insertProduct({
    category_id: categoryIds["test-pantalones"],
    name: "TEST Pantalón Disponible",
    slug: "test-pantalon-disponible",
    description: "Producto de prueba (TEST/DEMO). Con stock disponible.",
    price: 28000,
    status: "published",
    is_featured: false,
  });
  await insertVariants([
    { product_id: pantalonDisponibleId, size_id: sizeIds.M, color_id: colorIds.Negro, sku: "TEST-PD-M-NEG", stock: 8, is_active: true },
    { product_id: pantalonDisponibleId, size_id: sizeIds.L, color_id: colorIds.Negro, sku: "TEST-PD-L-NEG", stock: 5, is_active: true },
  ]);
  const pantalonImg = await uploadPlaceholder("pantalon-disponible-1.svg", "Pantalon Disponible", "#3b3b58", "#ffffff");
  await insertImage({ productId: pantalonDisponibleId, storagePath: pantalonImg, altText: "TEST Pantalón Disponible", sortOrder: 1, isPrimary: true });

  // 4. Publicado pero sin stock en ninguna variante (agotado, sigue visible).
  const remeraAgotadaId = await insertProduct({
    category_id: categoryIds["test-remeras"],
    name: "TEST Remera Agotada",
    slug: "test-remera-agotada",
    description: "Producto de prueba (TEST/DEMO). Publicado, sin stock en ninguna variante.",
    price: 15000,
    status: "published",
    is_featured: false,
  });
  await insertVariants([
    { product_id: remeraAgotadaId, size_id: sizeIds.S, color_id: colorIds.Gris, sku: "TEST-RA-S-GRI", stock: 0, is_active: true },
    { product_id: remeraAgotadaId, size_id: sizeIds.M, color_id: colorIds.Gris, sku: "TEST-RA-M-GRI", stock: 0, is_active: true },
  ]);
  const remeraAgotadaImg = await uploadPlaceholder("remera-agotada-1.svg", "Remera Agotada", "#808080", "#ffffff");
  await insertImage({ productId: remeraAgotadaId, storagePath: remeraAgotadaImg, altText: "TEST Remera Agotada", sortOrder: 1, isPrimary: true });

  // 5. Oculto: no debe aparecer en el storefront público.
  const buzoOcultoId = await insertProduct({
    category_id: categoryIds["test-buzos"],
    name: "TEST Buzo Oculto",
    slug: "test-buzo-oculto",
    description: "Producto de prueba (TEST/DEMO). status = hidden, no debe ser visible públicamente.",
    price: 22000,
    status: "hidden",
    is_featured: false,
  });
  await insertVariants([{ product_id: buzoOcultoId, size_id: sizeIds.M, color_id: colorIds.Negro, sku: "TEST-BO-M-NEG", stock: 3, is_active: true }]);

  // 6. Descontinuado: no debe aparecer en el storefront público. Sin imagen
  //    a propósito (valida el placeholder de "sin imágenes").
  await insertProduct({
    category_id: categoryIds["test-pantalones"],
    name: "TEST Pantalón Descontinuado",
    slug: "test-pantalon-descontinuado",
    description: "Producto de prueba (TEST/DEMO). status = discontinued, no debe ser visible públicamente.",
    price: 28000,
    status: "discontinued",
    is_featured: false,
  });

  console.log("Seed TEST completo.");
}

try {
  if (CLEAN_ONLY) {
    await cleanTestData();
    console.log("Limpieza TEST completa (sizes/colors preservados, son catálogo de referencia).");
  } else {
    await seed();
  }
} catch (err) {
  console.error("Seed falló:", err.message ?? err);
  process.exit(1);
}
