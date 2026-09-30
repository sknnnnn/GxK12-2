// Lógica de "agregar el outfit completo" (Bible §12) y configuración de
// navegación (Bible §14): piezas listas / a elegir / sin stock, líneas de
// carrito resultantes, y consistencia de los links de navegación.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateOutfit, pieceKey, resolvePiece } from "@/lib/outfits/selection";
import { ACCESS_LINKS, EXTRA_LINKS, FOOTER_LINKS, MENU_LINKS, getMenuLink } from "@/lib/storefront/navigation";
import { HOME_ENTRY_SECTIONS } from "@/lib/storefront/content";
import type { CatalogProductDetail, CatalogVariant } from "@/services/catalog";
import type { OutfitProduct } from "@/services/outfits";

function variant(id: string, inStock: boolean, priceOverride: number | null = null): CatalogVariant {
  return { id, sku: `SKU-${id}`, priceOverride, inStock, size: { id: `s-${id}`, name: "M" }, color: null };
}

function piece(productId: string, variants: CatalogVariant[], variantId: string | null = null): OutfitProduct {
  const product: CatalogProductDetail = {
    id: productId,
    slug: `slug-${productId}`,
    name: `Producto ${productId}`,
    description: null,
    price: 1000,
    category: null,
    images: [],
    variants,
    sizes: [],
    colors: [],
    inStock: variants.some((v) => v.inStock),
  };
  return { product, variantId };
}

describe("resolvePiece", () => {
  it("variante fijada: lista si hay stock, no disponible si no hay o no existe", () => {
    assert.equal(resolvePiece(piece("p", [variant("v1", true)], "v1"), null).status, "ready");
    assert.equal(resolvePiece(piece("p", [variant("v1", false)], "v1"), null).status, "unavailable");
    assert.equal(resolvePiece(piece("p", [variant("v1", true)], "otra"), null).status, "unavailable");
  });

  it("sin variante fijada: requiere elegir; sin stock en ninguna, no disponible", () => {
    const free = piece("p", [variant("v1", true), variant("v2", false)]);
    assert.equal(resolvePiece(free, null).status, "needs-selection");
    assert.equal(resolvePiece(free, variant("v1", true)).status, "ready");
    assert.equal(resolvePiece(free, variant("v2", false)).status, "unavailable");
    assert.equal(resolvePiece(piece("p", [variant("v1", false)]), null).status, "unavailable");
  });
});

describe("evaluateOutfit", () => {
  const fixed = piece("p1", [variant("v1", true, 900)], "v1");
  const free = piece("p2", [variant("v2", true), variant("v3", true)]);

  it("solo está completo con todas las piezas listas y arma una línea por variante", () => {
    const pending = evaluateOutfit([fixed, free], {});
    assert.equal(pending.complete, false);
    assert.equal(pending.needsSelection, 1);

    const done = evaluateOutfit([fixed, free], { [pieceKey(free)]: variant("v3", true) });
    assert.equal(done.complete, true);
    assert.deepEqual(
      done.lines.map((l) => [l.variantId, l.unitPrice]),
      [
        ["v1", 900],
        ["v3", 1000],
      ],
    );
  });

  it("una pieza sin stock impide completar el outfit", () => {
    const result = evaluateOutfit([fixed, piece("p3", [variant("v9", false)])], {});
    assert.equal(result.complete, false);
    assert.equal(result.unavailable, 1);
  });

  it("no agrega dos veces la misma variante y un outfit vacío no está completo", () => {
    const generic = piece("p1", [variant("v1", true)]);
    const result = evaluateOutfit([fixed, generic], { [pieceKey(generic)]: variant("v1", true) });
    assert.equal(result.complete, true);
    assert.equal(result.lines.length, 1);
    assert.equal(evaluateOutfit([], {}).complete, false);
  });
});

describe("navegación", () => {
  it("expone el menú y los accesos de la Bible §14 en orden", () => {
    assert.deepEqual(
      MENU_LINKS.map((l) => l.label),
      ["TIENDA", "OUTFITS", "UNIVERSO", "EVENTOS", "NOSOTROS"],
    );
    assert.deepEqual(
      ACCESS_LINKS.map((l) => l.label),
      ["BUSCAR", "FAMILIA GxK 🐾", "FAVORITOS"],
    );
  });

  it("todo link sin ruta declara de qué depende; las rutas son absolutas", () => {
    for (const link of [...MENU_LINKS, ...ACCESS_LINKS, ...FOOTER_LINKS, ...EXTRA_LINKS]) {
      if (link.href === null) assert.ok(link.dependsOn, `${link.key} sin dependsOn`);
      else assert.ok(link.href.startsWith("/"), `${link.key} href inválido`);
    }
  });

  it("las secciones de entrada de Home apuntan a links existentes", () => {
    for (const section of Object.values(HOME_ENTRY_SECTIONS)) {
      for (const key of section.entryKeys) assert.doesNotThrow(() => getMenuLink(key));
    }
  });
});
