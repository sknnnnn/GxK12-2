// Tests de los datos de Home: Nuevos ingresos (services/catalog) y lectura
// pública de outfits vigentes (services/outfits). Usan el fake en memoria:
// el orden por created_at lo resuelve PostgREST y no se simula acá, así que
// se verifica límite, filtros, vigencia por fechas y armado de outfits.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./support/fakeSupabase";
import { getNewArrivals, getProductDetailsByIds } from "@/services/catalog";
import { getCurrentOutfits, isOutfitCurrent } from "@/services/outfits";

const NOW = new Date("2026-10-01T12:00:00Z");

function product(id: string, status = "published") {
  return {
    id,
    slug: `slug-${id}`,
    name: `Producto ${id}`,
    price: 1000,
    is_featured: false,
    status,
    categories: null,
    product_images: [],
  };
}

function variantRow(id: string, productId: string, inStock: boolean, sizeId: string | null = null, colorId: string | null = null) {
  return { id, product_id: productId, size_id: sizeId, color_id: colorId, sku: `SKU-${id}`, price_override: null, in_stock: inStock };
}

function outfit(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `outfit-${id}`,
    name: `Outfit ${id}`,
    description: null,
    cover_image: null,
    status: "published",
    starts_at: null,
    ends_at: null,
    sort_order: 0,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function link(outfitId: string, productId: string, sortOrder = 0, variantId: string | null = null) {
  return { outfit_id: outfitId, product_id: productId, variant_id: variantId, sort_order: sortOrder };
}

describe("getNewArrivals", () => {
  const tables = () => ({
    products: [product("a"), product("b"), product("c"), product("hidden", "draft")],
    storefront_product_variants: [
      { product_id: "a", in_stock: true },
      { product_id: "b", in_stock: false },
    ],
  });

  it("respeta el límite y solo devuelve publicados", async () => {
    const { client } = createFakeSupabase(tables());
    const result = await getNewArrivals(client, { limit: 2 });
    assert.equal(result.length, 2);
    assert.ok(result.every((p) => p.id !== "hidden"));
  });

  it("refleja disponibilidad por producto", async () => {
    const { client } = createFakeSupabase(tables());
    const byId = new Map((await getNewArrivals(client, { limit: 10 })).map((p) => [p.id, p]));
    assert.equal(byId.get("a")?.inStock, true);
    assert.equal(byId.get("b")?.inStock, false);
    assert.equal(byId.get("c")?.inStock, false);
  });

  it("límite inválido o sin productos devuelve estado vacío", async () => {
    const { client } = createFakeSupabase(tables());
    assert.deepEqual(await getNewArrivals(client, { limit: 0 }), []);
    assert.deepEqual(await getNewArrivals(client, { limit: Number.NaN }), []);
    const empty = createFakeSupabase({ products: [], storefront_product_variants: [] });
    assert.deepEqual(await getNewArrivals(empty.client, { limit: 5 }), []);
  });
});

describe("isOutfitCurrent", () => {
  it("sin fechas es vigente; respeta inicio y fin (fin exclusivo)", () => {
    assert.equal(isOutfitCurrent({ starts_at: null, ends_at: null }, NOW), true);
    assert.equal(isOutfitCurrent({ starts_at: "2026-10-02T00:00:00Z", ends_at: null }, NOW), false);
    assert.equal(isOutfitCurrent({ starts_at: "2026-10-01T12:00:00Z", ends_at: null }, NOW), true);
    assert.equal(isOutfitCurrent({ starts_at: null, ends_at: "2026-10-01T12:00:00Z" }, NOW), false);
    assert.equal(isOutfitCurrent({ starts_at: "2026-09-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z" }, NOW), true);
  });
});

describe("getCurrentOutfits", () => {
  it("sin outfits devuelve estado vacío", async () => {
    const { client } = createFakeSupabase({ outfits: [], outfit_products: [], products: [], storefront_product_variants: [] });
    assert.deepEqual(await getCurrentOutfits(client, { now: NOW }), []);
  });

  it("filtra por estado y vigencia, ordena por sort_order y por recencia", async () => {
    const { client } = createFakeSupabase({
      outfits: [
        outfit("late", { sort_order: 2 }),
        outfit("first-old", { sort_order: 1, created_at: "2026-08-01T00:00:00Z" }),
        outfit("first-new", { sort_order: 1, created_at: "2026-09-15T00:00:00Z" }),
        outfit("future", { starts_at: "2026-12-01T00:00:00Z" }),
        outfit("expired", { ends_at: "2026-09-30T00:00:00Z" }),
        outfit("draft", { status: "draft" }),
      ],
      outfit_products: ["late", "first-old", "first-new", "future", "expired", "draft"].map((id) => link(id, "p1")),
      products: [product("p1")],
      storefront_product_variants: [variantRow("v1", "p1", true)],
    });
    const result = await getCurrentOutfits(client, { now: NOW });
    assert.deepEqual(
      result.map((o) => o.id),
      ["first-new", "first-old", "late"],
    );
  });

  it("ordena los productos, conserva variante, omite no publicados y outfits sin piezas visibles", async () => {
    const { client } = createFakeSupabase({
      outfits: [outfit("o1", { cover_image: "https://cdn.test/cover.jpg" }), outfit("o2")],
      outfit_products: [
        link("o1", "p2", 2, "v9"),
        link("o1", "p1", 1),
        link("o1", "hidden", 0),
        link("o2", "hidden", 0),
      ],
      products: [product("p1"), product("p2"), product("hidden", "draft")],
      storefront_product_variants: [],
    });
    const result = await getCurrentOutfits(client, { now: NOW });
    assert.equal(result.length, 1);
    assert.equal(result[0].coverImageUrl, "https://cdn.test/cover.jpg");
    assert.deepEqual(
      result[0].products.map((p) => [p.product.id, p.variantId]),
      [
        ["p1", null],
        ["p2", "v9"],
      ],
    );
  });

  it("portada ausente es null y limit recorta", async () => {
    const { client } = createFakeSupabase({
      outfits: [outfit("o1", { sort_order: 1 }), outfit("o2", { sort_order: 2 })],
      outfit_products: [link("o1", "p1"), link("o2", "p1")],
      products: [product("p1")],
      storefront_product_variants: [],
    });
    const result = await getCurrentOutfits(client, { now: NOW, limit: 1 });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "o1");
    assert.equal(result[0].coverImageUrl, null);
  });
});

describe("getProductDetailsByIds", () => {
  it("arma detalle con variantes, talles y colores por producto en un solo lote", async () => {
    const { client } = createFakeSupabase({
      products: [product("p1"), product("p2"), product("hidden", "draft")],
      storefront_product_variants: [
        variantRow("v1", "p1", true, "s-m", "c-black"),
        variantRow("v2", "p1", false, "s-l", "c-black"),
        variantRow("v3", "p2", true, "s-l", null),
      ],
      sizes: [
        { id: "s-m", name: "M" },
        { id: "s-l", name: "L" },
      ],
      colors: [{ id: "c-black", name: "Negro", hex_code: "#000000" }],
    });
    const details = await getProductDetailsByIds(client, ["p1", "p2", "hidden"]);
    const byId = new Map(details.map((d) => [d.id, d]));
    assert.equal(details.length, 2);
    assert.deepEqual(byId.get("p1")?.variants.map((v) => v.id), ["v1", "v2"]);
    assert.deepEqual(byId.get("p1")?.sizes.map((s) => s.name), ["M", "L"]);
    assert.deepEqual(byId.get("p1")?.colors.map((c) => c.name), ["Negro"]);
    assert.equal(byId.get("p1")?.inStock, true);
    assert.deepEqual(byId.get("p2")?.sizes.map((s) => s.name), ["L"]);
    assert.deepEqual(byId.get("p2")?.colors, []);
  });

  it("sin ids devuelve vacío", async () => {
    const { client } = createFakeSupabase({});
    assert.deepEqual(await getProductDetailsByIds(client, []), []);
  });
});
