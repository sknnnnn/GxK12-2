// Tests de los servicios que alimentan la navegación del Dashboard de Admin:
// IDs para linkear pedidos/productos, y el filtro de Inventario que
// reproduce exactamente el universo de las alertas de stock del Dashboard.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./support/fakeSupabase";
import { getInventoryItems, getRecentOrders, getStockAlerts, LOW_STOCK_THRESHOLD } from "@/services/admin";

function variant(id: string, stock: number, isActive: boolean) {
  return {
    id,
    sku: `SKU-${id}`,
    stock,
    is_active: isActive,
    size_id: null,
    color_id: null,
    product_id: "prod-1",
    // Forma del embed de PostgREST (products!inner(...), products(name)).
    products: { id: "prod-1", slug: "remera", name: "Remera", status: "published", category_id: "cat-1", categories: null, product_images: [] },
    sizes: null,
    colors: null,
  };
}

const VARIANTS = [
  variant("low-active", 2, true),
  variant("low-inactive", 1, false),
  variant("out-active", 0, true),
  variant("out-inactive", 0, false),
  variant("ok-active", LOW_STOCK_THRESHOLD + 1, true),
];

describe("Dashboard -> Inventario", () => {
  it("el filtro de Inventario (stock + variantes activas) coincide con las alertas del Dashboard", async () => {
    const fake = createFakeSupabase({ product_variants: structuredClone(VARIANTS) });

    const alerts = await getStockAlerts(fake.client);
    const lowInInventory = await getInventoryItems(fake.client, { stockStatus: "low_stock", variantActivity: "active" });
    const outInInventory = await getInventoryItems(fake.client, { stockStatus: "out_of_stock", variantActivity: "active" });

    assert.deepEqual(lowInInventory.map((item) => item.variantId), ["low-active"]);
    assert.deepEqual(outInInventory.map((item) => item.variantId), ["out-active"]);
    assert.equal(alerts.lowStock.length, lowInInventory.length);
    assert.equal(alerts.outOfStock.length, outInInventory.length);
  });

  it("sin filtro de variante, Inventario sigue mostrando activas e inactivas (comportamiento previo)", async () => {
    const fake = createFakeSupabase({ product_variants: structuredClone(VARIANTS) });
    const low = await getInventoryItems(fake.client, { stockStatus: "low_stock" });
    assert.deepEqual(low.map((item) => item.variantId).sort(), ["low-active", "low-inactive"]);

    const inactive = await getInventoryItems(fake.client, { variantActivity: "inactive" });
    assert.ok(inactive.every((item) => !item.isActive));
  });

  it("las alertas de stock incluyen el producto para linkear a su ficha", async () => {
    const fake = createFakeSupabase({ product_variants: structuredClone(VARIANTS) });
    const alerts = await getStockAlerts(fake.client);
    assert.equal(alerts.lowStock[0].productId, "prod-1");
  });
});

describe("Dashboard -> Pedido", () => {
  it("los pedidos recientes traen el id para abrir /admin/pedidos/[id]", async () => {
    const fake = createFakeSupabase({
      orders: [
        { id: "order-uuid-1", order_number: "GXK-0001", created_at: "2026-09-28T10:00:00Z", total: 100, status: "payment_confirmed", customers: { name: "Ana" } },
      ],
      payments: [{ order_id: "order-uuid-1", status: "approved", created_at: "2026-09-28T10:05:00Z" }],
    });
    const [order] = await getRecentOrders(fake.client);
    assert.equal(order.id, "order-uuid-1");
    assert.equal(order.orderNumber, "GXK-0001");
    assert.equal(order.latestPaymentStatus, "approved");
  });
});
