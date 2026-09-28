// Tests del flujo de envíos (PRO-128). Sin APIs externas reales: Supabase
// es un fake en memoria (tests/support/fakeSupabase.ts) y los proveedores
// son fakes, salvo en los casos de "credenciales ausentes", que usan los
// adapters reales con las env vars vacías (fallan antes de cualquier fetch).
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createFakeSupabase } from "./support/fakeSupabase";
import {
  getShippingProvider,
  getShippingSettings,
  parseShippingSettingsInput,
  resolveCheckoutShipping,
  updateShippingSettings,
} from "@/services/shipping";
import { ensureShipmentForPaidOrder } from "@/services/shipping/shipments";
import type { CreateShipmentInput, CreateShipmentResult, ShippingProvider, ShippingProviderId } from "@/services/shipping/provider";
import { submitCheckout } from "@/services/checkout";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORIGIN_ADDRESS = { streetName: "Depósito", streetNumber: "100", locality: "CABA", province: "C", postalCode: "1000" };

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: true,
    active_provider: "correo_argentino",
    shipping_cost: 4500,
    service_type: "CP",
    origin_address: ORIGIN_ADDRESS,
    origin_contact: { name: "GXK", email: "envios@gxk.test", phone: "1100000000" },
    ...overrides,
  };
}

function baseTables(overrides: { orderStatus?: string; items?: Record<string, unknown>[]; settings?: Record<string, unknown> } = {}) {
  return {
    shipping_settings: [settingsRow(overrides.settings)],
    orders: [
      {
        id: "order-1",
        order_number: "GXK-0001",
        status: overrides.orderStatus ?? "payment_confirmed",
        customer_id: "cust-1",
        shipping_address: { streetName: "Av. Siempre Viva", streetNumber: "742", locality: "Springfield", province: "B", postalCode: "1234" },
      },
    ],
    customers: [{ id: "cust-1", name: "Ana Pérez", email: "ana@example.test", phone: "1155555555" }],
    order_items: overrides.items ?? [
      { order_id: "order-1", product_id: "prod-1", product_name: "Remera", sku: "R-1", unit_price: 10000, quantity: 1 },
    ],
    products: [
      { id: "prod-1", weight_grams: 300, length_cm: 30, width_cm: 20, height_cm: 5 },
      { id: "prod-2", weight_grams: 500, length_cm: 40, width_cm: 30, height_cm: 10 },
    ],
    product_variants: [{ id: "var-1", product_id: "prod-1", stock: 4 }],
    payments: [{ id: "pay-1", order_id: "order-1", status: "approved", amount: 14500 }],
    shipments: [] as Record<string, unknown>[],
  };
}

type FakeProvider = ShippingProvider & { calls: CreateShipmentInput[] };

function fakeProvider(
  id: ShippingProviderId,
  create: (input: CreateShipmentInput) => Promise<CreateShipmentResult> = async () => ({
    externalId: `${id}-ext-1`,
    trackingNumber: `${id}-TRK-1`,
    status: "created",
    raw: {},
  }),
): FakeProvider {
  const calls: CreateShipmentInput[] = [];
  return {
    id,
    capabilities: { quote: false, cancelShipment: false, branchPickup: false },
    calls,
    async createShipment(input) {
      calls.push(input);
      return create(input);
    },
    async getLabel() {
      throw new Error("not used");
    },
    async getTracking() {
      return [];
    },
  };
}

function providerRegistry(providers: Partial<Record<ShippingProviderId, FakeProvider>>) {
  return (id: ShippingProviderId) => {
    const provider = providers[id];
    if (!provider) throw new Error(`proveedor ${id} no esperado en este test`);
    return provider;
  };
}

function snapshot<T>(value: T): T {
  return structuredClone(value);
}

// Ruido esperado de console.error (incidencias logueadas a propósito).
let originalConsoleError: typeof console.error;
beforeEach(() => {
  originalConsoleError = console.error;
  console.error = () => {};
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ---------------------------------------------------------------------------
// Configuración: proveedor activo y costo
// ---------------------------------------------------------------------------

describe("configuración de envíos", () => {
  it("1. el proveedor activo sale de shipping_settings", async () => {
    const fake = createFakeSupabase(baseTables());
    const settings = await getShippingSettings(fake.client);
    assert.equal(settings.activeProvider, "correo_argentino");
    assert.equal(getShippingProvider("correo_argentino").id, "correo_argentino");
    assert.equal(getShippingProvider("andreani").id, "andreani");
  });

  it("2. cambiar el proveedor activo cambia el proveedor usado para el alta, sin tocar código", async () => {
    const correo = fakeProvider("correo_argentino");
    const andreani = fakeProvider("andreani");
    const resolveProvider = providerRegistry({ correo_argentino: correo, andreani });

    const fakeA = createFakeSupabase(baseTables());
    await ensureShipmentForPaidOrder(fakeA.client, "order-1", { resolveProvider });
    assert.equal(correo.calls.length, 1);
    assert.equal(fakeA.tables.shipments[0].provider, "correo_argentino");

    const fakeB = createFakeSupabase(baseTables());
    const parsed = parseShippingSettingsInput({
      activeProvider: "andreani",
      shippingCost: "4500",
      originStreetName: "Depósito",
      originStreetNumber: "100",
      originLocality: "CABA",
      originProvince: "C",
      originPostalCode: "1000",
      originContactName: "GXK",
    });
    assert.ok(parsed.ok);
    assert.deepEqual(await updateShippingSettings(fakeB.client, parsed.value), { ok: true });
    await ensureShipmentForPaidOrder(fakeB.client, "order-1", { resolveProvider });
    assert.equal(andreani.calls.length, 1);
    assert.equal(fakeB.tables.shipments[0].provider, "andreani");
  });

  it("3. el costo de envío es el configurado", async () => {
    const fake = createFakeSupabase(baseTables({ settings: { shipping_cost: 3999.5 } }));
    const terms = resolveCheckoutShipping(await getShippingSettings(fake.client));
    assert.deepEqual(terms, { ok: true, provider: "correo_argentino", cost: 3999.5 });
  });

  it("3b. sin proveedor o costo configurado, el checkout no tiene términos de envío", async () => {
    const fake = createFakeSupabase(baseTables({ settings: { active_provider: null, shipping_cost: null } }));
    const terms = resolveCheckoutShipping(await getShippingSettings(fake.client));
    assert.deepEqual(terms, { ok: false, missing: ["active_provider", "shipping_cost"] });
  });

  it("11. configuración inválida rechazada", () => {
    const cases = [
      { activeProvider: "oca", shippingCost: "100" },
      { activeProvider: "", shippingCost: "100" },
      { activeProvider: "andreani", shippingCost: "-5" },
      { activeProvider: "andreani", shippingCost: "abc" },
      { activeProvider: "andreani", shippingCost: "10.123" },
      { activeProvider: "andreani", shippingCost: "" },
      { activeProvider: "andreani", shippingCost: "100", originStreetName: "Calle sin número" },
      { activeProvider: "andreani", shippingCost: "100", originContactEmail: "no-es-un-email" },
    ];
    for (const input of cases) {
      const result = parseShippingSettingsInput(input);
      assert.equal(result.ok, false, `debería rechazar ${JSON.stringify(input)}`);
    }

    const valid = parseShippingSettingsInput({ activeProvider: "correo_argentino", shippingCost: "4500,50" });
    assert.ok(valid.ok);
    assert.equal(valid.value.shippingCost, 4500.5);
    assert.equal(valid.value.originAddress, null);
  });

  it("11b. un valor inválido guardado en la base no se usa como proveedor", async () => {
    const fake = createFakeSupabase(baseTables({ settings: { active_provider: "oca" } }));
    assert.equal((await getShippingSettings(fake.client)).activeProvider, null);
  });
});

// ---------------------------------------------------------------------------
// Checkout: costo/proveedor determinados server-side
// ---------------------------------------------------------------------------

describe("checkout", () => {
  const savedMpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  beforeEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN; // nunca salir a la red
  });
  afterEach(() => {
    if (savedMpToken !== undefined) process.env.MERCADO_PAGO_ACCESS_TOKEN = savedMpToken;
  });

  function checkoutTables(settings: Record<string, unknown> = {}) {
    return {
      shipping_settings: [settingsRow(settings)],
      product_variants: [
        {
          id: "var-1",
          product_id: "prod-1",
          sku: "R-1",
          price_override: null,
          stock: 4,
          is_active: true,
          products: { name: "Remera", price: 10000, status: "published" },
          sizes: null,
          colors: null,
        },
      ],
    };
  }

  function rpcCreateOrder(fn: string, args: Record<string, unknown>) {
    assert.equal(fn, "create_order_with_reservation");
    const cost = args.p_shipping_cost as number;
    return { data: { order_number: "GXK-0002", subtotal: 10000, shipping_cost: cost, total: 10000 + cost }, error: null };
  }

  const baseInput = {
    items: [{ variantId: "var-1", quantity: 1 }],
    customer: { firstName: "Ana", lastName: "Pérez", email: "ana@example.test", phone: "1155555555" },
    shipping: { address: "Av. Siempre Viva 742", locality: "Springfield", province: "B", postalCode: "1234" },
    siteUrl: "http://localhost:3000",
  };

  it("13. el navegador no puede manipular proveedor ni costo final", async () => {
    const fake = createFakeSupabase(checkoutTables(), { rpc: rpcCreateOrder });
    const tampered = {
      ...baseInput,
      shippingCost: 0,
      provider: "andreani",
      shipping: { ...baseInput.shipping, shippingCost: 0, provider: "andreani" },
    } as unknown as Parameters<typeof submitCheckout>[1];

    const result = await submitCheckout(fake.client, tampered);

    assert.equal(fake.rpcCalls.length, 1);
    assert.equal(fake.rpcCalls[0].args.p_shipping_cost, 4500);
    assert.equal(fake.rpcCalls[0].args.p_shipping_method, "correo_argentino");
    assert.ok(result.ok);
    assert.equal(result.order.shippingCost, 4500);
    assert.equal(result.order.total, 14500);
  });

  it("3c. sin configuración de envíos el checkout no crea el pedido ni reserva stock", async () => {
    const fake = createFakeSupabase(checkoutTables({ active_provider: null }), { rpc: rpcCreateOrder });
    const result = await submitCheckout(fake.client, baseInput);
    assert.deepEqual(result, { ok: false, issues: [{ type: "shipping_unavailable" }] });
    assert.equal(fake.rpcCalls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Alta del envío post-pago
// ---------------------------------------------------------------------------

describe("ensureShipmentForPaidOrder", () => {
  it("4/9. con pago confirmado crea el envío y persiste external id + tracking", async () => {
    const provider = fakeProvider("correo_argentino");
    const fake = createFakeSupabase(baseTables());

    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });

    assert.deepEqual(result, { ok: true, shipmentId: fake.tables.shipments[0].id, status: "created", trackingNumber: "correo_argentino-TRK-1" });
    const shipment = fake.tables.shipments[0];
    assert.equal(shipment.order_id, "order-1");
    assert.equal(shipment.status, "created");
    assert.equal(shipment.external_id, "correo_argentino-ext-1");
    assert.equal(shipment.tracking_number, "correo_argentino-TRK-1");
    assert.equal(shipment.service_type, "CP");
    assert.equal(shipment.destination_type, "address");
    assert.equal(shipment.cost, null, "el costo cobrado vive en orders.shipping_cost, no se duplica");
    assert.equal(shipment.last_error, null);
    assert.equal(shipment.attempts, 1);

    const [input] = provider.calls;
    assert.equal(input.orderNumber, "GXK-0001");
    assert.deepEqual(input.origin, ORIGIN_ADDRESS);
    assert.equal(input.destination.type, "address");
    assert.deepEqual(input.parcel, { weightGrams: 300, depthCm: 30, widthCm: 20, heightCm: 5, declaredValue: 10000 });
    assert.equal(input.recipient.name, "Ana Pérez");
  });

  it("10. persiste la etiqueta cuando el proveedor entrega una URL, y no inventa una cuando no", async () => {
    const withLabel = fakeProvider("correo_argentino", async () => ({
      externalId: "ext",
      trackingNumber: "TRK",
      status: "created",
      labelUrl: "https://proveedor.example/etiquetas/ext.pdf",
      raw: {},
    }));
    const fakeA = createFakeSupabase(baseTables());
    await ensureShipmentForPaidOrder(fakeA.client, "order-1", { resolveProvider: providerRegistry({ correo_argentino: withLabel }) });
    assert.equal(fakeA.tables.shipments[0].label_url, "https://proveedor.example/etiquetas/ext.pdf");

    const fakeB = createFakeSupabase(baseTables());
    await ensureShipmentForPaidOrder(fakeB.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: fakeProvider("correo_argentino") }),
    });
    assert.equal(fakeB.tables.shipments[0].label_url, null);
  });

  it("4b. el alta asíncrona del proveedor queda como 'processing'", async () => {
    const provider = fakeProvider("andreani", async () => ({ externalId: "ext", trackingNumber: "", status: "processing", raw: {} }));
    const fake = createFakeSupabase(baseTables({ settings: { active_provider: "andreani" } }));
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", { resolveProvider: providerRegistry({ andreani: provider }) });
    assert.equal(result.ok, true);
    assert.equal(fake.tables.shipments[0].status, "processing");
    assert.equal(fake.tables.shipments[0].tracking_number, null);
  });

  it("5. un pedido con pago pendiente no genera envío", async () => {
    const provider = fakeProvider("correo_argentino");
    const fake = createFakeSupabase(baseTables({ orderStatus: "pending_payment" }));
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });
    assert.deepEqual(result, { ok: false, reason: "order_not_paid", orderStatus: "pending_payment" });
    assert.equal(provider.calls.length, 0);
    assert.equal(fake.tables.shipments.length, 0);
    assert.equal(fake.mutations.length, 0);
  });

  it("6/7. si el proveedor falla: incidencia en shipments, sin tocar pago, pedido ni stock", async () => {
    const provider = fakeProvider("correo_argentino", async () => {
      throw new Error("HTTP 503 del proveedor");
    });
    const tables = baseTables();
    const before = { orders: snapshot(tables.orders), payments: snapshot(tables.payments), variants: snapshot(tables.product_variants) };
    const fake = createFakeSupabase(tables);

    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.reason, "failed");
    const shipment = fake.tables.shipments[0];
    assert.equal(shipment.status, "failed");
    assert.match(String(shipment.last_error), /HTTP 503 del proveedor/);

    assert.deepEqual(fake.tables.orders, before.orders, "el pedido sigue intacto e identificable");
    assert.deepEqual(fake.tables.payments, before.payments, "el pago no se altera");
    assert.deepEqual(fake.tables.product_variants, before.variants, "el stock no se libera");
    assert.equal(fake.rpcCalls.length, 0, "no se invoca ninguna función de stock/pago");
    assert.ok(fake.mutations.every((mutation) => mutation.table === "shipments"));
  });

  it("8. reintentos (webhook repetido) no crean envíos duplicados", async () => {
    const provider = fakeProvider("correo_argentino");
    const fake = createFakeSupabase(baseTables());
    const deps = { resolveProvider: providerRegistry({ correo_argentino: provider }) };

    await ensureShipmentForPaidOrder(fake.client, "order-1", deps);
    const second = await ensureShipmentForPaidOrder(fake.client, "order-1", deps);

    assert.equal(!second.ok && second.reason, "already_exists");
    assert.equal(provider.calls.length, 1);
    assert.equal(fake.tables.shipments.length, 1);
  });

  it("8b. llamadas concurrentes llegan una sola vez al proveedor", async () => {
    const provider = fakeProvider("correo_argentino");
    const fake = createFakeSupabase(baseTables());
    const deps = { resolveProvider: providerRegistry({ correo_argentino: provider }) };

    const results = await Promise.all([
      ensureShipmentForPaidOrder(fake.client, "order-1", deps),
      ensureShipmentForPaidOrder(fake.client, "order-1", deps),
    ]);

    assert.equal(provider.calls.length, 1);
    assert.equal(fake.tables.shipments.length, 1);
    assert.equal(results.filter((result) => result.ok).length, 1);
  });

  it("8c. un intento en curso reciente no se pisa; uno fallido se reintenta sobre la misma fila", async () => {
    let shouldFail = true;
    const provider = fakeProvider("correo_argentino", async () => {
      if (shouldFail) throw new Error("caído");
      return { externalId: "ext-2", trackingNumber: "TRK-2", status: "created", raw: {} };
    });
    const fake = createFakeSupabase(baseTables());
    const deps = { resolveProvider: providerRegistry({ correo_argentino: provider }) };

    await ensureShipmentForPaidOrder(fake.client, "order-1", deps);
    assert.equal(fake.tables.shipments[0].status, "failed");

    shouldFail = false;
    const retry = await ensureShipmentForPaidOrder(fake.client, "order-1", deps);
    assert.equal(retry.ok, true);
    assert.equal(fake.tables.shipments.length, 1);
    assert.equal(fake.tables.shipments[0].attempts, 2);
    assert.equal(fake.tables.shipments[0].last_error, null);
    assert.equal(fake.tables.shipments[0].tracking_number, "TRK-2");

    // Un 'pending' recién iniciado (otro proceso) no se reclama.
    const pendingFake = createFakeSupabase(baseTables());
    pendingFake.tables.shipments.push({
      id: "ship-p",
      order_id: "order-1",
      provider: "correo_argentino",
      status: "pending",
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    });
    const inProgress = await ensureShipmentForPaidOrder(pendingFake.client, "order-1", deps);
    assert.deepEqual(inProgress, { ok: false, reason: "in_progress", shipmentId: "ship-p" });
  });

  it("sin proveedor activo no registra nada ni llama a ningún proveedor", async () => {
    const fake = createFakeSupabase(baseTables({ settings: { active_provider: null } }));
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", { resolveProvider: providerRegistry({}) });
    assert.deepEqual(result, { ok: false, reason: "provider_not_configured" });
    assert.equal(fake.mutations.length, 0);
  });

  it("origen de GXK sin configurar: incidencia explícita, sin llamar al proveedor", async () => {
    const provider = fakeProvider("correo_argentino");
    const fake = createFakeSupabase(baseTables({ settings: { origin_address: null } }));
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });
    assert.equal(!result.ok && result.reason, "failed");
    assert.match(String(fake.tables.shipments[0].last_error), /ShippingConfigurationIncompleteError/);
    assert.equal(provider.calls.length, 0);
  });

  it("domicilio del pedido en una sola línea (checkout actual): incidencia explícita, sin parsear adivinando", async () => {
    const provider = fakeProvider("correo_argentino");
    const tables = baseTables();
    tables.orders[0].shipping_address = { address: "Av. Siempre Viva 742", locality: "Springfield", province: "B", postalCode: "1234" } as never;
    const fake = createFakeSupabase(tables);
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });
    assert.equal(!result.ok && result.reason, "failed");
    assert.match(String(fake.tables.shipments[0].last_error), /ShippingDestinationIncompleteError/);
    assert.equal(provider.calls.length, 0);
  });

  it("14. packaging no soportado (varias unidades) falla sin efectos destructivos", async () => {
    const provider = fakeProvider("correo_argentino");
    const tables = baseTables({
      items: [
        { order_id: "order-1", product_id: "prod-1", product_name: "Remera", sku: "R-1", unit_price: 10000, quantity: 1 },
        { order_id: "order-1", product_id: "prod-2", product_name: "Buzo", sku: "B-1", unit_price: 20000, quantity: 1 },
      ],
    });
    const before = { orders: snapshot(tables.orders), payments: snapshot(tables.payments), variants: snapshot(tables.product_variants) };
    const fake = createFakeSupabase(tables);

    const result = await ensureShipmentForPaidOrder(fake.client, "order-1", {
      resolveProvider: providerRegistry({ correo_argentino: provider }),
    });

    assert.equal(!result.ok && result.reason, "failed");
    assert.match(String(fake.tables.shipments[0].last_error), /ShippingPackagingNotSupportedError/);
    assert.equal(provider.calls.length, 0);
    assert.deepEqual(fake.tables.orders, before.orders);
    assert.deepEqual(fake.tables.payments, before.payments);
    assert.deepEqual(fake.tables.product_variants, before.variants);
  });

  it("14b. productos sin datos físicos: incidencia, nunca se inventan peso/dimensiones", async () => {
    const provider = fakeProvider("correo_argentino");
    const tables = baseTables();
    tables.products[0].weight_grams = null as never;
    const fake = createFakeSupabase(tables);
    await ensureShipmentForPaidOrder(fake.client, "order-1", { resolveProvider: providerRegistry({ correo_argentino: provider }) });
    assert.match(String(fake.tables.shipments[0].last_error), /ShippingMissingPhysicalDataError/);
    assert.equal(provider.calls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// 12. Credenciales ausentes (adapters REALES, sin red)
// ---------------------------------------------------------------------------

describe("12. credenciales ausentes", () => {
  const ENV_KEYS = [
    "CORREO_ARGENTINO_API_KEY",
    "CORREO_ARGENTINO_AGREEMENT",
    "CORREO_ARGENTINO_ENVIRONMENT",
    "ANDREANI_API_KEY",
    "ANDREANI_API_URL",
  ];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("Correo Argentino sin credenciales: incidencia controlada, sin exponer secretos", async () => {
    process.env.CORREO_ARGENTINO_API_KEY = "super-secret-api-key";
    const fake = createFakeSupabase(baseTables());
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1");

    assert.equal(!result.ok && result.reason, "failed");
    const lastError = String(fake.tables.shipments[0].last_error);
    assert.match(lastError, /CorreoArgentinoNotConfiguredError/);
    assert.match(lastError, /CORREO_ARGENTINO_AGREEMENT/);
    assert.ok(!lastError.includes("super-secret-api-key"));
    assert.equal(fake.tables.payments[0].status, "approved");
  });

  it("Andreani sin credenciales: incidencia controlada", async () => {
    const fake = createFakeSupabase(baseTables({ settings: { active_provider: "andreani" } }));
    const result = await ensureShipmentForPaidOrder(fake.client, "order-1");
    assert.equal(!result.ok && result.reason, "failed");
    assert.match(String(fake.tables.shipments[0].last_error), /AndreaniNotConfiguredError/);
  });
});
