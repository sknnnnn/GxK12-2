// Transiciones de estado de pedidos desde Admin (services/admin/orders.updateOrderStatus).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./support/fakeSupabase";
import { updateOrderStatus } from "@/services/admin";

describe("updateOrderStatus", () => {
  it("aplica una transición válida", async () => {
    const fake = createFakeSupabase({ orders: [{ id: "o1", status: "payment_confirmed" }] });
    assert.deepEqual(await updateOrderStatus(fake.client, "o1", "preparing"), { ok: true });
    assert.equal(fake.tables.orders[0].status, "preparing");
  });

  it("rechaza una transición inválida sin tocar el pedido", async () => {
    const fake = createFakeSupabase({ orders: [{ id: "o1", status: "pending_payment" }] });
    assert.deepEqual(await updateOrderStatus(fake.client, "o1", "shipped"), { ok: false, reason: "invalid_transition" });
    assert.equal(fake.tables.orders[0].status, "pending_payment");
    assert.equal(fake.mutations.length, 0);
  });

  it("no pisa un cambio concurrente (ej. el cron canceló el pedido vencido y liberó el stock)", async () => {
    let raced = false;
    const fake = createFakeSupabase(
      { orders: [{ id: "o1", status: "pending_payment" }] },
      {
        // Justo después de que el Admin leyó "pending_payment", el cron de
        // reservas vencidas cancela el pedido (y devuelve el stock).
        afterExecute: (table, op, tables) => {
          if (table === "orders" && op === "select" && !raced) {
            raced = true;
            tables.orders[0].status = "cancelled";
          }
        },
      },
    );

    const result = await updateOrderStatus(fake.client, "o1", "payment_confirmed");

    assert.deepEqual(result, { ok: false, reason: "invalid_transition" });
    assert.equal(fake.tables.orders[0].status, "cancelled", "el pedido cancelado no se convierte en pago confirmado");
  });

  it("pedido inexistente (o invisible por RLS): not_found", async () => {
    const fake = createFakeSupabase({ orders: [] });
    assert.deepEqual(await updateOrderStatus(fake.client, "nope", "preparing"), { ok: false, reason: "not_found" });
  });
});
