// Admin: gestión operativa de pedidos (listado, detalle, transición de
// estado). Convención de GXK Core: ver encabezado de src/services/admin/index.ts.
//
// Todo acá corre con el cliente de SESIÓN del admin -- las policies
// admin_read_orders/admin_update_orders, admin_read_customers,
// admin_read_order_items, admin_read_payments y admin_all_shipments (ver
// migración inicial) ya dan a un admin activo exactamente los privilegios
// que este módulo necesita (lectura de todo, escritura SOLO de
// orders.status). No hace falta ni corresponde service-role.
//
// Esto NO reimplementa nada de services/checkout ni de la función SQL
// create_order_with_reservation: no toca stock, no crea pedidos, no toca
// payments ni shipments -- solo los lee. El único INSERT/UPDATE de este
// archivo es updateOrderStatus, y actualiza únicamente orders.status.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
import { buildImageUrl } from "@/services/catalog";

// Debe coincidir exactamente con el CHECK de orders.status (ver migración
// inicial) -- no inventar un segundo sistema de estados.
export const ORDER_STATUSES = [
  "pending_payment",
  "payment_confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "incidence",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Mismo listado que services/payments.PAYMENT_STATUSES (debe coincidir con
// el CHECK de payments.status, ver migración mercado_pago_payment_support)
// -- deliberadamente copiado acá en vez de importado: services/payments
// importa src/lib/mercadopago/client.ts, que trae la guarda "server-only".
// services/admin/index.ts (este barrel) lo importan Client Components de
// Productos (ej. ProductForm.tsx) solo por sus tipos/constantes -- si este
// archivo importara de services/payments, esa guarda terminaría arrastrada
// al bundle de cliente y rompería el build. Ver services/payments/index.ts
// para el comentario gemelo de esta misma lista.
export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "in_process",
  "in_mediation",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
] as const;

/**
 * Transiciones permitidas del flujo normal del pedido -- únicamente las
 * cuatro explícitamente definidas (PRO-139 §6). Los estados especiales
 * (cancelled/refunded/incidence) NO tienen una regla de entrada clara
 * todavía en el sistema actual (ver comentario en updateOrderStatus más
 * abajo) -- deliberadamente sin entradas acá, no se inventan.
 */
export const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ["payment_confirmed"],
  payment_confirmed: ["preparing"],
  preparing: ["shipped"],
  shipped: ["delivered"],
};

// ----------------------------------------------------------------------------
// Listado
// ----------------------------------------------------------------------------

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  latestPaymentStatus: string | null;
  /** Texto crudo de shipments.status -- sin CHECK en el schema, no se normaliza (ver services/shipping). */
  shipmentStatus: string | null;
  hasShipment: boolean;
};

export type AdminOrderFilters = {
  /** Número de pedido, nombre o email del cliente. */
  search?: string;
  paymentStatus?: string;
  orderStatus?: OrderStatus;
  shipmentFilter?: "all" | "none" | "has_shipment";
};

type AdminOrderListQueryRow = Pick<Tables<"orders">, "id" | "order_number" | "created_at" | "total" | "status"> & {
  customers: Pick<Tables<"customers">, "name" | "email"> | null;
};

/**
 * Listado de pedidos, más recientes primero. `orderStatus` se filtra en SQL
 * (columna propia de orders); `search` cruza número de pedido + nombre/email
 * del cliente (tabla distinta vía join) y `paymentStatus`/`shipmentFilter`
 * dependen de datos de OTRAS tablas (payments/shipments) -- ninguno de los
 * tres se puede expresar en un solo select de PostgREST, así que se
 * resuelven acá en JS después de traer el resto ya filtrado (mismo criterio
 * que getAdminProducts/getInventoryItems).
 */
export async function getAdminOrders(
  supabase: GxkSupabaseClient,
  filters: AdminOrderFilters = {},
): Promise<AdminOrderListItem[]> {
  let query = supabase
    .from("orders")
    .select("id, order_number, created_at, total, status, customers ( name, email )")
    .order("created_at", { ascending: false });

  if (filters.orderStatus) {
    query = query.eq("status", filters.orderStatus);
  }

  const { data, error } = await query.returns<AdminOrderListQueryRow[]>();
  if (error) throw error;

  const orders = data ?? [];
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);

  const [paymentsRes, shipmentsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("order_id, status, created_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false }),
    supabase.from("shipments").select("order_id, status").in("order_id", orderIds),
  ]);

  if (paymentsRes.error) throw paymentsRes.error;
  if (shipmentsRes.error) throw shipmentsRes.error;

  const latestPaymentByOrder = new Map<string, string>();
  for (const payment of paymentsRes.data ?? []) {
    if (!latestPaymentByOrder.has(payment.order_id)) {
      latestPaymentByOrder.set(payment.order_id, payment.status);
    }
  }

  const shipmentByOrder = new Map<string, string | null>();
  for (const shipment of shipmentsRes.data ?? []) {
    if (!shipmentByOrder.has(shipment.order_id)) {
      shipmentByOrder.set(shipment.order_id, shipment.status);
    }
  }

  let items: AdminOrderListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    customerName: order.customers?.name ?? "—",
    customerEmail: order.customers?.email ?? "—",
    total: order.total,
    status: order.status,
    latestPaymentStatus: latestPaymentByOrder.get(order.id) ?? null,
    shipmentStatus: shipmentByOrder.get(order.id) ?? null,
    hasShipment: shipmentByOrder.has(order.id),
  }));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    items = items.filter(
      (item) =>
        item.orderNumber.toLowerCase().includes(term) ||
        item.customerName.toLowerCase().includes(term) ||
        item.customerEmail.toLowerCase().includes(term),
    );
  }

  if (filters.paymentStatus) {
    items = items.filter((item) => item.latestPaymentStatus === filters.paymentStatus);
  }

  if (filters.shipmentFilter === "none") {
    items = items.filter((item) => !item.hasShipment);
  } else if (filters.shipmentFilter === "has_shipment") {
    items = items.filter((item) => item.hasShipment);
  }

  return items;
}

// ----------------------------------------------------------------------------
// Detalle
// ----------------------------------------------------------------------------

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  /** Snapshot histórico -- NUNCA el nombre actual del producto. */
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  /**
   * Imagen ACTUAL del producto (no es parte del snapshot -- order_items no
   * guarda imagen). Puramente decorativo, best-effort: null si el producto
   * ya no existe (product_id -> set null) o no tiene imágenes.
   */
  primaryImageUrl: string | null;
};

export type AdminOrderPayment = {
  id: string;
  provider: string;
  externalId: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export type AdminOrderShipment = {
  provider: string;
  serviceType: string | null;
  externalId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  cost: number | null;
  status: string | null;
  destinationType: string | null;
  destinationData: unknown;
  /** Incidencia del último intento de alta (PRO-128), null si no hubo error. */
  lastError: string | null;
  attempts: number;
};

export type OrderShippingAddress = {
  address?: string;
  locality?: string;
  province?: string;
  postalCode?: string;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
  shippingAddress: OrderShippingAddress;
  customer: { name: string; email: string; phone: string };
  items: AdminOrderItem[];
  /** Todos los intentos de pago (payments es 1:N por diseño, ver migración inicial), más reciente primero. */
  payments: AdminOrderPayment[];
  /** null si todavía no existe ningún registro de envío (ver services/shipping: sin integración real activa). */
  shipment: AdminOrderShipment | null;
};

type AdminOrderDetailQueryRow = Pick<
  Tables<"orders">,
  "id" | "order_number" | "created_at" | "status" | "subtotal" | "shipping_cost" | "total" | "shipping_method" | "shipping_address"
> & {
  customers: Pick<Tables<"customers">, "name" | "email" | "phone"> | null;
  order_items: Pick<
    Tables<"order_items">,
    "id" | "product_id" | "variant_id" | "product_name" | "variant_label" | "sku" | "unit_price" | "quantity" | "subtotal"
  >[];
};

/** Devuelve `null` si el pedido no existe (o, para un no-admin, si RLS lo oculta -- mismo resultado). */
export async function getAdminOrderById(supabase: GxkSupabaseClient, id: string): Promise<AdminOrderDetail | null> {
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, status, subtotal, shipping_cost, total, shipping_method, shipping_address, customers ( name, email, phone ), order_items ( id, product_id, variant_id, product_name, variant_label, sku, unit_price, quantity, subtotal )",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<AdminOrderDetailQueryRow>();

  if (error) throw error;
  if (!order) return null;

  const productIds = [...new Set(order.order_items.map((item) => item.product_id).filter((v): v is string => v !== null))];

  const [paymentsRes, shipmentsRes, imagesRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, provider, external_id, status, amount, currency, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("shipments")
      .select("provider, service_type, external_id, tracking_number, label_url, cost, status, destination_type, destination_data, last_error, attempts")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    productIds.length > 0
      ? supabase.from("product_images").select("product_id, storage_path, is_primary, sort_order").in("product_id", productIds)
      : Promise.resolve<{
          data: Pick<Tables<"product_images">, "product_id" | "storage_path" | "is_primary" | "sort_order">[];
          error: null;
        }>({ data: [], error: null }),
  ]);

  if (paymentsRes.error) throw paymentsRes.error;
  if (shipmentsRes.error) throw shipmentsRes.error;
  if (imagesRes.error) throw imagesRes.error;

  const imagesByProduct = new Map<string, Pick<Tables<"product_images">, "product_id" | "storage_path" | "is_primary" | "sort_order">[]>();
  for (const image of imagesRes.data ?? []) {
    const list = imagesByProduct.get(image.product_id) ?? [];
    list.push(image);
    imagesByProduct.set(image.product_id, list);
  }

  const primaryImageByProduct = new Map<string, string>();
  for (const [productId, images] of imagesByProduct) {
    const primary = images.find((image) => image.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
    if (primary) primaryImageByProduct.set(productId, buildImageUrl(supabase, primary.storage_path));
  }

  const shipmentRow = shipmentsRes.data?.[0];

  return {
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    status: order.status,
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    total: order.total,
    shippingMethod: order.shipping_method,
    shippingAddress: (order.shipping_address ?? {}) as OrderShippingAddress,
    customer: {
      name: order.customers?.name ?? "—",
      email: order.customers?.email ?? "—",
      phone: order.customers?.phone ?? "—",
    },
    items: order.order_items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      sku: item.sku,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal ?? item.unit_price * item.quantity,
      primaryImageUrl: item.product_id ? (primaryImageByProduct.get(item.product_id) ?? null) : null,
    })),
    payments: (paymentsRes.data ?? []).map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      externalId: payment.external_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.created_at,
    })),
    shipment: shipmentRow
      ? {
          provider: shipmentRow.provider,
          serviceType: shipmentRow.service_type,
          externalId: shipmentRow.external_id,
          trackingNumber: shipmentRow.tracking_number,
          labelUrl: shipmentRow.label_url,
          cost: shipmentRow.cost,
          status: shipmentRow.status,
          destinationType: shipmentRow.destination_type,
          destinationData: shipmentRow.destination_data,
          lastError: shipmentRow.last_error,
          attempts: shipmentRow.attempts,
        }
      : null,
  };
}

// ----------------------------------------------------------------------------
// Transición de estado
// ----------------------------------------------------------------------------

export type UpdateOrderStatusResult = { ok: true } | { ok: false; reason: "invalid_transition" | "not_found" };

/**
 * Aplica una transición de orders.status, validada contra
 * ORDER_STATUS_TRANSITIONS -- nunca confía en qué estado dice tener el
 * cliente: relee el estado actual acá mismo antes de decidir si la
 * transición pedida es válida. Actualiza ÚNICAMENTE `status` (no toca
 * stock, payments ni shipments -- eso sigue viviendo en
 * create_order_with_reservation/services/payments/services/shipping).
 *
 * Si el pedido no existe (o RLS lo oculta porque quien llama no es un
 * admin activo -- admin_read_orders exige lo mismo que admin_update_orders,
 * así que el resultado es indistinguible y deliberadamente así) devuelve
 * "not_found" sin tocar nada.
 */
export async function updateOrderStatus(
  supabase: GxkSupabaseClient,
  orderId: string,
  newStatus: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  const { data: current, error: fetchError } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (fetchError) throw fetchError;
  if (!current) return { ok: false, reason: "not_found" };

  const allowedNext = ORDER_STATUS_TRANSITIONS[current.status as OrderStatus] ?? [];
  if (!allowedNext.includes(newStatus)) {
    return { ok: false, reason: "invalid_transition" };
  }

  // Condicional sobre el estado que se acaba de validar: si entre la lectura
  // y este UPDATE otro proceso cambió el pedido (ej. release_expired_stock_
  // reservations lo canceló y devolvió el stock, o el webhook lo pasó a
  // refunded), no se pisa ese cambio -- un "pago confirmado" escrito sobre
  // un pedido ya cancelado dejaría un pedido pagado sin stock reservado.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .eq("status", current.status)
    .select("id");
  if (error) throw error;
  if (!updated || updated.length === 0) return { ok: false, reason: "invalid_transition" };

  return { ok: true };
}
