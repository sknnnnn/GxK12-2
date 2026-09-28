// Creación del envío DESPUÉS del pago confirmado (PRO-128).
//
// Flujo: webhook de Mercado Pago -> record_payment_result (orders.status =
// 'payment_confirmed') -> ensureShipmentForPaidOrder. También lo invoca
// Admin Web para reintentar una incidencia.
//
// Separación de responsabilidades: este módulo SOLO escribe en `shipments`.
// Nunca toca orders.status, payments ni stock -- si el proveedor falla, el
// pago sigue confirmado, la reserva de stock sigue descontada y el pedido
// sigue intacto; la incidencia queda en shipments.status = 'failed' +
// shipments.last_error, visible y reintentable desde Admin Web.
//
// Idempotencia: índice único parcial uq_shipments_order_active (un envío no
// cancelado por pedido) + "claim" optimista por shipments.attempts para
// reintentos. Llamarlo N veces (reintentos del webhook, doble click en
// Admin) nunca da de alta más de un envío en el proveedor por pedido.
//
// Convención de GXK Core: recibe el GxkSupabaseClient. Webhook -> cliente
// admin (service-role); Admin Web -> cliente de sesión (RLS admin_*).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { resolveShippingParcel, getShippingProvider } from "./index";
import type { ShippableOrderItem, ShippingDestination, ShippingProvider, ShippingProviderId } from "./provider";
import { getShippingSettings, parsePostalAddress } from "./settings";

// Debe coincidir con shipments_status_check (migración shipping_flow).
export const SHIPMENT_STATUSES = ["pending", "processing", "created", "failed", "cancelled"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Alta en curso",
  processing: "En proceso (proveedor)",
  created: "Creado",
  failed: "Incidencia",
  cancelled: "Cancelado",
};

/** Estados del pedido desde los que corresponde (re)intentar el alta del envío: pago ya confirmado. */
const SHIPPABLE_ORDER_STATUSES = ["payment_confirmed", "preparing"];

/**
 * Un intento que quedó en 'pending' (el proceso murió entre la llamada al
 * proveedor y la persistencia del resultado) se puede volver a reclamar
 * pasado este plazo. Mayor al timeout de los adapters (15s) con amplio margen.
 */
export const STALE_PENDING_MS = 15 * 60 * 1000;

const MAX_ERROR_LENGTH = 1000;

/** Falta configuración de GXK necesaria para dar de alta el envío (no es un error del proveedor). */
export class ShippingConfigurationIncompleteError extends Error {
  constructor(detail: string) {
    super(`Configuración de envíos incompleta: ${detail}`);
    this.name = "ShippingConfigurationIncompleteError";
  }
}

/**
 * El domicilio guardado en el pedido no tiene la forma que exigen los
 * proveedores (calle y número por separado). El checkout actual guarda una
 * única línea `address` -- separar calle/número (o permitir sucursal) es una
 * decisión pendiente de GXK sobre el formulario de destino; no se parsea
 * esa línea adivinando dónde termina la calle.
 */
export class ShippingDestinationIncompleteError extends Error {
  constructor() {
    super(
      "El domicilio del pedido no tiene calle, número, localidad, provincia y código postal por separado -- no se puede armar el destino para el proveedor",
    );
    this.name = "ShippingDestinationIncompleteError";
  }
}

export type EnsureShipmentResult =
  | { ok: true; shipmentId: string; status: "created" | "processing"; trackingNumber: string }
  | { ok: false; reason: "order_not_found" }
  | { ok: false; reason: "order_not_paid"; orderStatus: string }
  | { ok: false; reason: "provider_not_configured" }
  | { ok: false; reason: "already_exists"; shipmentId: string; status: string | null }
  | { ok: false; reason: "in_progress"; shipmentId: string | null }
  | { ok: false; reason: "failed"; shipmentId: string; error: string };

export type EnsureShipmentDeps = {
  resolveProvider?: (id: ShippingProviderId) => ShippingProvider;
  now?: () => Date;
};

type ShipmentRow = Tables<"shipments">;

function describeError(error: unknown): string {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Da de alta (o reintenta) el envío de un pedido con pago confirmado usando
 * el proveedor ACTIVO de shipping_settings. Nunca lanza por un fallo del
 * proveedor ni por datos faltantes (eso queda registrado como incidencia y
 * se devuelve `reason: "failed"`); sí propaga errores de base de datos.
 */
export async function ensureShipmentForPaidOrder(
  supabase: GxkSupabaseClient,
  orderId: string,
  deps: EnsureShipmentDeps = {},
): Promise<EnsureShipmentResult> {
  const resolveProvider = deps.resolveProvider ?? getShippingProvider;
  const now = deps.now ?? (() => new Date());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status, customer_id, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return { ok: false, reason: "order_not_found" };
  if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
    return { ok: false, reason: "order_not_paid", orderStatus: order.status };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId);
  if (existingError) throw existingError;

  const active = (existingRows ?? []).find((row) => row.status !== "cancelled") ?? null;

  if (active && (active.status === "created" || active.status === "processing")) {
    return { ok: false, reason: "already_exists", shipmentId: active.id, status: active.status };
  }
  if (
    active &&
    active.status === "pending" &&
    active.last_attempt_at &&
    now().getTime() - new Date(active.last_attempt_at).getTime() < STALE_PENDING_MS
  ) {
    return { ok: false, reason: "in_progress", shipmentId: active.id };
  }

  const settings = await getShippingSettings(supabase);
  if (!settings.activeProvider) {
    // Sin proveedor no se puede ni registrar la fila (shipments.provider es
    // NOT NULL): el pedido queda "pagado sin envío", visible en Admin > Envíos.
    return { ok: false, reason: "provider_not_configured" };
  }
  const providerId = settings.activeProvider;
  const attemptAt = now().toISOString();

  // --- Claim: una sola ejecución concurrente llega al proveedor ------------
  let shipment: ShipmentRow;
  if (active) {
    // Reintento de una incidencia ('failed') o de un 'pending' abandonado.
    // Lock optimista por `attempts`: si otro proceso reclamó primero, este
    // UPDATE no matchea ninguna fila. Usa el proveedor activo HOY (GXK pudo
    // cambiarlo justamente por la incidencia).
    const { data: claimed, error: claimError } = await supabase
      .from("shipments")
      .update({
        status: "pending",
        provider: providerId,
        service_type: settings.serviceType,
        attempts: active.attempts + 1,
        last_attempt_at: attemptAt,
        last_error: null,
      })
      .eq("id", active.id)
      .eq("attempts", active.attempts)
      .select("*");
    if (claimError) throw claimError;
    if (!claimed || claimed.length === 0) return { ok: false, reason: "in_progress", shipmentId: active.id };
    shipment = claimed[0];
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("shipments")
      .insert({
        order_id: orderId,
        provider: providerId,
        service_type: settings.serviceType,
        status: "pending",
        // Único destino que ofrece hoy el checkout. El domicilio en sí NO se
        // copia acá: vive en orders.shipping_address (sin duplicar). Para
        // sucursal/locker (a futuro) destination_data guardará branchId/kind.
        destination_type: "address",
        destination_data: {},
        attempts: 1,
        last_attempt_at: attemptAt,
      })
      .select("*")
      .single();
    if (insertError) {
      // Otro proceso insertó el envío activo de este pedido en paralelo.
      if (isUniqueViolation(insertError)) return { ok: false, reason: "in_progress", shipmentId: null };
      throw insertError;
    }
    shipment = inserted;
  }

  // --- Alta en el proveedor --------------------------------------------------
  // providerAccepted: a partir de ahí el proveedor YA dio de alta el envío --
  // un fallo posterior (persistencia) nunca debe marcarlo "failed", porque
  // un reintento lo duplicaría del lado del proveedor.
  let providerAccepted = false;
  try {
    if (!settings.originAddress || !settings.originContact) {
      throw new ShippingConfigurationIncompleteError(
        "falta el domicilio de despacho y/o el contacto del remitente de GXK (Admin > Configuración)",
      );
    }

    const destinationAddress = parsePostalAddress(order.shipping_address);
    if (!destinationAddress) throw new ShippingDestinationIncompleteError();
    const destination: ShippingDestination = { type: "address", address: destinationAddress };

    const [customerRes, itemsRes] = await Promise.all([
      supabase.from("customers").select("name, email, phone").eq("id", order.customer_id).maybeSingle(),
      supabase.from("order_items").select("product_id, product_name, sku, unit_price, quantity").eq("order_id", orderId),
    ]);
    if (customerRes.error) throw customerRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const items = itemsRes.data ?? [];
    const productIds = [...new Set(items.map((item) => item.product_id).filter((id): id is string => id !== null))];
    const productsRes =
      productIds.length > 0
        ? await supabase.from("products").select("id, weight_grams, length_cm, width_cm, height_cm").in("id", productIds)
        : { data: [], error: null };
    if (productsRes.error) throw productsRes.error;
    const productById = new Map((productsRes.data ?? []).map((product) => [product.id, product]));

    const shippableItems: ShippableOrderItem[] = items.map((item) => {
      const product = item.product_id ? productById.get(item.product_id) : undefined;
      return {
        productId: item.product_id ?? "",
        productName: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        weightGrams: product?.weight_grams ?? null,
        lengthCm: product?.length_cm ?? null,
        widthCm: product?.width_cm ?? null,
        heightCm: product?.height_cm ?? null,
      };
    });

    // Lanza ShippingMissingPhysicalDataError / ShippingPackagingNotSupportedError
    // -- nunca inventa peso, dimensiones ni reglas de consolidación.
    const parcel = resolveShippingParcel(shippableItems);

    const customer = customerRes.data;
    const result = await resolveProvider(providerId).createShipment({
      orderNumber: order.order_number,
      origin: settings.originAddress,
      originContact: settings.originContact,
      destination,
      recipient: {
        name: customer?.name ?? "",
        email: customer?.email || undefined,
        phone: customer?.phone || undefined,
      },
      parcel,
      serviceType: settings.serviceType ?? undefined,
    });
    providerAccepted = true;

    const { error: saveError } = await supabase
      .from("shipments")
      .update({
        status: result.status,
        external_id: result.externalId,
        tracking_number: result.trackingNumber || null,
        label_url: result.labelUrl ?? null,
        last_error: null,
      })
      .eq("id", shipment.id);
    if (saveError) {
      // Queda 'pending' (reclamable recién pasado STALE_PENDING_MS) con el
      // externalId en el log para conciliarlo a mano.
      console.error(
        `[shipping] alta OK en ${providerId} para ${order.order_number} (externalId=${result.externalId}) pero no se pudo persistir:`,
        saveError,
      );
      throw saveError;
    }

    return { ok: true, shipmentId: shipment.id, status: result.status, trackingNumber: result.trackingNumber };
  } catch (error) {
    if (providerAccepted) throw error;
    const message = describeError(error);
    const { error: failError } = await supabase
      .from("shipments")
      .update({ status: "failed", last_error: message })
      .eq("id", shipment.id);
    if (failError) throw failError;
    console.error(`[shipping] no se pudo dar de alta el envío de ${order.order_number} en ${providerId}: ${message}`);
    return { ok: false, reason: "failed", shipmentId: shipment.id, error: message };
  }
}

// ----------------------------------------------------------------------------
// Listado para Admin > Envíos
// ----------------------------------------------------------------------------

export type AdminShipmentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  provider: string;
  status: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  lastError: string | null;
  attempts: number;
  lastAttemptAt: string | null;
};

export type AdminShippingOverview = {
  shipments: AdminShipmentRow[];
  /** Pedidos con pago confirmado sin ningún envío activo (ej. proveedor sin configurar al confirmarse el pago). */
  paidWithoutShipment: Array<{ orderId: string; orderNumber: string; createdAt: string }>;
};

type ShipmentWithOrderRow = Pick<
  ShipmentRow,
  "id" | "order_id" | "provider" | "status" | "tracking_number" | "label_url" | "last_error" | "attempts" | "last_attempt_at"
> & { orders: Pick<Tables<"orders">, "order_number" | "status"> | null };

export async function getAdminShippingOverview(supabase: GxkSupabaseClient): Promise<AdminShippingOverview> {
  const [shipmentsRes, paidOrdersRes] = await Promise.all([
    supabase
      .from("shipments")
      .select("id, order_id, provider, status, tracking_number, label_url, last_error, attempts, last_attempt_at, orders ( order_number, status )")
      .order("created_at", { ascending: false })
      .returns<ShipmentWithOrderRow[]>(),
    supabase
      .from("orders")
      .select("id, order_number, created_at")
      .in("status", SHIPPABLE_ORDER_STATUSES)
      .order("created_at", { ascending: true }),
  ]);
  if (shipmentsRes.error) throw shipmentsRes.error;
  if (paidOrdersRes.error) throw paidOrdersRes.error;

  const shipments = shipmentsRes.data ?? [];
  const ordersWithActiveShipment = new Set(shipments.filter((row) => row.status !== "cancelled").map((row) => row.order_id));

  return {
    shipments: shipments.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      orderNumber: row.orders?.order_number ?? "—",
      orderStatus: row.orders?.status ?? "—",
      provider: row.provider,
      status: row.status,
      trackingNumber: row.tracking_number,
      labelUrl: row.label_url,
      lastError: row.last_error,
      attempts: row.attempts,
      lastAttemptAt: row.last_attempt_at,
    })),
    paidWithoutShipment: (paidOrdersRes.data ?? [])
      .filter((order) => !ordersWithActiveShipment.has(order.id))
      .map((order) => ({ orderId: order.id, orderNumber: order.order_number, createdAt: order.created_at })),
  };
}
