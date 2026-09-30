import { test } from "node:test";
import assert from "node:assert/strict";
import { caminoPosition, isRewardUsable, rewardPercent } from "../src/lib/familia/camino";
import { isEarlyAccess } from "../src/lib/familia/membersOnly";
import { describeNotification } from "../src/lib/familia/notifications";
import { conversionRate, parseClientAnalyticsEvent } from "../src/services/analytics";
import { parseCaminoSettingsInput } from "../src/services/admin/familia";

test("Camino: 1 compra confirmada = 1 estación, 10 estaciones y luego se reinicia", () => {
  assert.deepEqual(caminoPosition(0), { cycle: 1, station: 0, toNextReward: 5, nextRewardStation: 5 });
  assert.deepEqual(caminoPosition(4), { cycle: 1, station: 4, toNextReward: 1, nextRewardStation: 5 });
  assert.deepEqual(caminoPosition(5), { cycle: 1, station: 5, toNextReward: 5, nextRewardStation: 10 });
  assert.deepEqual(caminoPosition(10), { cycle: 1, station: 10, toNextReward: 5, nextRewardStation: 5 });
  assert.deepEqual(caminoPosition(11), { cycle: 2, station: 1, toNextReward: 4, nextRewardStation: 5 });
  assert.deepEqual(caminoPosition(20), { cycle: 2, station: 10, toNextReward: 5, nextRewardStation: 5 });
});

test("Camino: estación 5 = 20%; estación 10 sin porcentaje hasta que el admin lo defina", () => {
  const disabled = { rewardsEnabled: false, station10Percent: null, maxDiscountAmount: null, conditions: null };
  assert.equal(rewardPercent(5, disabled), 20);
  assert.equal(rewardPercent(10, disabled), null);
  assert.equal(isRewardUsable(5, disabled), false);
  const enabled = { ...disabled, rewardsEnabled: true };
  assert.equal(isRewardUsable(5, enabled), true);
  assert.equal(isRewardUsable(10, enabled), false);
  assert.equal(isRewardUsable(10, { ...enabled, station10Percent: 35 }), true);
});

test("Admin Camino: estación 10 hasta 50%", () => {
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
  };
  assert.equal(parseCaminoSettingsInput(form({ station10Percent: "51" })).ok, false);
  assert.equal(parseCaminoSettingsInput(form({ station10Percent: "0" })).ok, false);
  const ok = parseCaminoSettingsInput(form({ station10Percent: "50", rewardsEnabled: "on" }));
  assert.ok(ok.ok);
  assert.equal(ok.value.station10Percent, 50);
  assert.equal(ok.value.rewardsEnabled, true);
  assert.equal(ok.value.maxDiscountAmount, null);
});

test("Members Only: early access vigente solo hasta la fecha", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  assert.equal(isEarlyAccess(null, now), false);
  assert.equal(isEarlyAccess("2026-10-02T12:00:00Z", now), true);
  assert.equal(isEarlyAccess("2026-10-01T11:59:00Z", now), false);
});

test("Notificaciones: texto por tipo", () => {
  const order = describeNotification({ kind: "order_status", payload: { order_number: "GXK-000007", status: "shipped" }, title: null, body: null, link: null });
  assert.equal(order.title, "Pedido GXK-000007: Despachado");
  assert.equal(order.href, "/familia/pedidos/GXK-000007");
  const broadcast = describeNotification({ kind: "broadcast", payload: {}, title: "Hola", body: null, link: "javascript:alert(1)" });
  assert.equal(broadcast.href, null);
});

test("Analytics: solo eventos válidos del navegador", () => {
  const sessionId = "abcdef0123456789";
  assert.equal(parseClientAnalyticsEvent({ event: "order_created", sessionId }), null);
  assert.equal(parseClientAnalyticsEvent({ event: "hack", sessionId }), null);
  assert.equal(parseClientAnalyticsEvent({ event: "page_view", sessionId: "x" }), null);
  const event = parseClientAnalyticsEvent({ event: "add_to_cart", sessionId, productId: "not-a-uuid", outfitId: "11111111-1111-1111-1111-111111111111", quantity: 2, path: "/producto/x" });
  assert.deepEqual(event, {
    event: "add_to_cart",
    sessionId,
    path: "/producto/x",
    productId: null,
    outfitId: "11111111-1111-1111-1111-111111111111",
    entryId: null,
    query: null,
    quantity: 2,
  });
  assert.equal(conversionRate({ sessions: 0, sessions_with_order: 0 }), 0);
  assert.equal(conversionRate({ sessions: 4, sessions_with_order: 1 }), 0.25);
});
