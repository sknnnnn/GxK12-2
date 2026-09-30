// Bloque 2: búsqueda, filtros (talle, color, precio, disponibilidad), orden,
// categoría virtual NUEVO, parámetros de URL, medidas y WhatsApp contextual.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCatalogQuery,
  buildMeasurementTable,
  catalogQueryToSearch,
  NEW_CATEGORY_SLUG,
  normalizeText,
  parseCatalogParams,
  type CatalogListItem,
} from "@/services/catalog";
import { buildWhatsAppHref, productInquiryMessage } from "@/lib/storefront/whatsapp";

const SIZES = [
  { id: "s", name: "S" },
  { id: "m", name: "M" },
  { id: "l", name: "L" },
];
const COLORS = [
  { id: "negro", name: "Negro", hexCode: null },
  { id: "blanco", name: "Blanco", hexCode: null },
];

function item(id: string, overrides: Partial<CatalogListItem> = {}): CatalogListItem {
  return {
    id,
    slug: id,
    name: `Producto ${id}`,
    productType: null,
    price: 1000,
    isFeatured: false,
    category: { id: "c1", slug: "remeras", name: "Remeras" },
    primaryImage: null,
    inStock: true,
    description: null,
    createdAt: "2026-09-01T00:00:00Z",
    variants: [],
    ...overrides,
  };
}

const ITEMS = [
  item("satoru", {
    name: "Satoru",
    productType: "Remera oversize",
    price: 30000,
    createdAt: "2026-09-10T00:00:00Z",
    variants: [
      { sizeId: "m", colorId: "negro", inStock: true },
      { sizeId: "l", colorId: "negro", inStock: false },
    ],
  }),
  item("kaze", {
    name: "Kaze",
    productType: "Buzo",
    price: 50000,
    createdAt: "2026-09-20T00:00:00Z",
    category: { id: "c2", slug: "buzos", name: "Buzos & Sweaters" },
    variants: [{ sizeId: "s", colorId: "blanco", inStock: true }],
  }),
  item("ame", {
    name: "Ame",
    price: 20000,
    createdAt: "2026-08-01T00:00:00Z",
    inStock: false,
    variants: [{ sizeId: "m", colorId: "blanco", inStock: false }],
  }),
];

const run = (query: Parameters<typeof applyCatalogQuery>[1], newestLimit?: number) =>
  applyCatalogQuery(ITEMS, query, { sizes: SIZES, colors: COLORS, newestLimit }).items.map((i) => i.id);

describe("applyCatalogQuery", () => {
  it("ordena por más nuevo por defecto y por precio a pedido", () => {
    assert.deepEqual(run({}), ["kaze", "satoru", "ame"]);
    assert.deepEqual(run({ sort: "precio_asc" }), ["ame", "satoru", "kaze"]);
    assert.deepEqual(run({ sort: "precio_desc" }), ["kaze", "satoru", "ame"]);
  });

  it("filtra por categoría real y por NUEVO (los más recientes)", () => {
    assert.deepEqual(run({ category: "remeras" }), ["satoru", "ame"]);
    assert.deepEqual(run({ category: NEW_CATEGORY_SLUG }, 2), ["kaze", "satoru"]);
  });

  it("busca por nombre, tipo, categoría y color sin importar acentos", () => {
    assert.deepEqual(run({ search: "oversize" }), ["satoru"]);
    assert.deepEqual(run({ search: "remera" }), ["satoru", "ame"]);
    assert.deepEqual(run({ search: "SWEATERS" }), ["kaze"]);
    assert.deepEqual(run({ search: "negro satoru" }), ["satoru"]);
    assert.equal(normalizeText("Ñandú Árbol"), "nandu arbol");
  });

  it("talle, color y disponibilidad se evalúan sobre la misma variante", () => {
    assert.deepEqual(run({ sizeIds: ["m"] }), ["satoru", "ame"]);
    assert.deepEqual(run({ sizeIds: ["m"], inStockOnly: true }), ["satoru"]);
    assert.deepEqual(run({ sizeIds: ["l"], inStockOnly: true }), []);
    assert.deepEqual(run({ colorIds: ["blanco"], sizeIds: ["m"] }), ["ame"]);
  });

  it("filtra por rango de precio", () => {
    assert.deepEqual(run({ minPrice: 25000, maxPrice: 40000 }), ["satoru"]);
  });

  it("facetas: solo talles/colores presentes en la categoría, en orden del catálogo", () => {
    const { facets } = applyCatalogQuery(ITEMS, { category: "remeras" }, { sizes: SIZES, colors: COLORS });
    assert.deepEqual(facets.sizes.map((s) => s.id), ["m", "l"]);
    assert.deepEqual(facets.colors.map((c) => c.id), ["negro", "blanco"]);
  });
});

describe("parámetros de URL", () => {
  it("parsea y vuelve a serializar sin perder filtros; ignora valores inválidos", () => {
    const query = parseCatalogParams({ categoria: "remeras", q: "sat", talle: ["m", "l"], min: "100", max: "-1", stock: "1", orden: "precio_asc" });
    assert.deepEqual(query.sizeIds, ["m", "l"]);
    assert.equal(query.maxPrice, undefined);
    assert.equal(query.sort, "precio_asc");
    assert.equal(catalogQueryToSearch(query), "?categoria=remeras&q=sat&talle=m&talle=l&min=100&stock=1&orden=precio_asc");
    assert.equal(parseCatalogParams({ orden: "otro" }).sort, undefined);
  });
});

describe("medidas y WhatsApp", () => {
  it("arma la tabla talle × medida en orden de talles", () => {
    const table = buildMeasurementTable([
      { size_id: "l", label: "Ancho", value_cm: 58, sort_order: 0, sizes: { name: "L", sort_order: 3 } },
      { size_id: "m", label: "Ancho", value_cm: 55, sort_order: 0, sizes: { name: "M", sort_order: 2 } },
      { size_id: "m", label: "Largo", value_cm: 70, sort_order: 1, sizes: { name: "M", sort_order: 2 } },
    ]);
    assert.deepEqual(table?.labels, ["Ancho", "Largo"]);
    assert.deepEqual(table?.rows.map((r) => [r.sizeName, r.values]), [
      ["M", { Ancho: 55, Largo: 70 }],
      ["L", { Ancho: 58 }],
    ]);
    assert.equal(buildMeasurementTable([]), null);
  });

  it("mensaje contextual con el formato de la Bible", () => {
    assert.equal(
      productInquiryMessage({ productName: "Satoru", color: "Negro", size: "M" }),
      "Hola 🐾 Tengo una duda sobre Satoru, color negro, talle M.",
    );
    assert.equal(productInquiryMessage({ productName: "Satoru" }), "Hola 🐾 Tengo una duda sobre Satoru.");
    assert.ok(buildWhatsAppHref("5491100000000", "Hola").startsWith("https://wa.me/5491100000000?text=Hola"));
  });
});
