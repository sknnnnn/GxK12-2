// Bloque 3: medios de pago por modalidad (Bible §18-§19), tracking
// (Bible §33), emails y edición de variante en el carrito.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { amountDueOnline, paymentOptionsFor, DEFAULT_PAYMENT_SETTINGS } from "@/services/payments/settings";
import { buildTrackingTimeline, orderStatusLabel } from "@/lib/orders/status";
import { renderOrderEmail, sendOrderEmail } from "@/services/emails";
import { cartReducer } from "@/lib/cart/reducer";
import { createFakeSupabase } from "./support/fakeSupabase";

describe("medios de pago", () => {
  it("envío: solo pago completo; punto de encuentro: seña y efectivo según configuración", () => {
    assert.deepEqual(paymentOptionsFor(DEFAULT_PAYMENT_SETTINGS, "andreani").map((o) => o.id), ["mp_full"]);
    assert.deepEqual(paymentOptionsFor(DEFAULT_PAYMENT_SETTINGS, "meeting_point").map((o) => o.id), ["mp_full", "mp_deposit"]);
    const withCash = { ...DEFAULT_PAYMENT_SETTINGS, cashEnabled: true };
    assert.deepEqual(paymentOptionsFor(withCash, "meeting_point").map((o) => o.id), ["mp_full", "mp_deposit", "cash"]);
    assert.deepEqual(paymentOptionsFor(withCash, "correo_argentino").map((o) => o.id), ["mp_full"]);
    const noMp = { ...withCash, mercadoPagoEnabled: false };
    assert.deepEqual(paymentOptionsFor(noMp, "meeting_point").map((o) => o.id), ["cash"]);
  });

  it("la seña es el 50% con el mismo redondeo que la base", () => {
    const [full, deposit] = paymentOptionsFor(DEFAULT_PAYMENT_SETTINGS, "meeting_point");
    assert.equal(amountDueOnline(10001, full), 10001);
    assert.equal(amountDueOnline(10001, deposit), 5000.5);
  });
});

describe("tracking", () => {
  it("marca los 5 pasos de la Bible hasta el estado actual con sus fechas", () => {
    const timeline = buildTrackingTimeline("preparing", [
      { status: "pending_payment", at: "2026-10-01T10:00:00Z" },
      { status: "payment_confirmed", at: "2026-10-01T10:05:00Z" },
      { status: "preparing", at: "2026-10-02T09:00:00Z" },
    ]);
    assert.deepEqual(timeline.map((s) => s.label), ["Nuevo", "Pago confirmado", "Preparando", "Despachado", "Entregado"]);
    assert.deepEqual(timeline.map((s) => s.reached), [true, true, true, false, false]);
    assert.equal(timeline.find((s) => s.current)?.status, "preparing");
    assert.equal(orderStatusLabel("shipped"), "Despachado");
  });

  it("un pedido con incidencia muestra lo alcanzado antes", () => {
    const timeline = buildTrackingTimeline("incidence", [{ status: "pending_payment", at: "2026-10-01T10:00:00Z" }]);
    assert.deepEqual(timeline.map((s) => s.reached), [true, false, false, false, false]);
    assert.equal(timeline.some((s) => s.current), false);
  });
});

describe("emails", () => {
  const data = {
    customerName: "Ana",
    orderNumber: "GXK-000010",
    status: "pending_payment",
    total: 20000,
    amountDueOnline: 10000,
    balanceDue: 10000,
    paymentMethod: "mercado_pago",
    paymentPlan: "deposit",
    trackingNumber: null,
    carrier: null,
    trackingUrl: "https://gxk.test/seguimiento?pedido=GXK-000010",
  };

  it("arma los mensajes con montos y link de seguimiento", () => {
    const created = renderOrderEmail("order_created", data);
    assert.equal(created.subject, "Recibimos tu pedido GXK-000010");
    assert.match(created.text, /ahora por Mercado Pago/);
    assert.match(created.text, /seguimiento\?pedido=GXK-000010/);
    const shipped = renderOrderEmail("order_status", { ...data, status: "shipped", trackingNumber: "TRK1", carrier: "Andreani" });
    assert.match(shipped.subject, /Despachado/);
    assert.match(shipped.text, /TRK1/);
  });

  it("sin proveedor configurado queda registrado como omitido y no lanza", async () => {
    const fake = createFakeSupabase({
      orders: [
        {
          id: "o1",
          order_number: "GXK-000010",
          status: "pending_payment",
          total: 20000,
          amount_due_online: 20000,
          balance_due: 0,
          payment_method: "mercado_pago",
          payment_plan: "full",
          customers: { name: "Ana", email: "ana@x.test" },
        },
      ],
      shipments: [],
      email_log: [],
    });
    const result = await sendOrderEmail(fake.client, { orderId: "o1", template: "order_created", trackingUrl: "u" }, { provider: null });
    assert.equal(result, "skipped");
    assert.equal(fake.tables.email_log[0].status, "skipped");

    const sent: string[] = [];
    const ok = await sendOrderEmail(
      fake.client,
      { orderId: "o1", template: "payment_confirmed", trackingUrl: "u" },
      { provider: { id: "fake", send: async (m) => void sent.push(m.to) } },
    );
    assert.equal(ok, "sent");
    assert.deepEqual(sent, ["ana@x.test"]);
  });
});

describe("carrito: cambiar talle/color", () => {
  const line = (variantId: string, quantity: number) => ({
    variantId,
    productId: "p1",
    productSlug: "p",
    productName: "P",
    size: null,
    color: null,
    sku: null,
    unitPrice: 100,
    imageUrl: null,
    quantity,
  });

  it("conserva la cantidad y la posición; si la variante ya estaba, suma", () => {
    const { quantity: _q, ...next } = line("v2", 0);
    void _q;
    const state = { lines: [line("v1", 2), line("v3", 1)] };
    assert.deepEqual(
      cartReducer(state, { type: "REPLACE_VARIANT", fromVariantId: "v1", line: next }).lines.map((l) => [l.variantId, l.quantity]),
      [
        ["v2", 2],
        ["v3", 1],
      ],
    );
    const { quantity: _q3, ...existing } = line("v3", 0);
    void _q3;
    assert.deepEqual(
      cartReducer(state, { type: "REPLACE_VARIANT", fromVariantId: "v1", line: existing }).lines.map((l) => [l.variantId, l.quantity]),
      [["v3", 3]],
    );
  });
});
