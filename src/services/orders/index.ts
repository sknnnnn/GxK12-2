// Orders: consulta pública del pedido para el comprador (confirmación y
// tracking, Bible §33).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient ya construido. La consulta pública no tiene sesión del
// comprador: se resuelve con un cliente admin server-only
// (createSupabaseAdminClient) y devuelve solo un subconjunto seguro -- nunca
// el hash/token, ni datos de `customers` más allá de lo que el propio
// comprador ya conoce.

import { createHash } from "node:crypto";
import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";

export type OrderStatusLine = {
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
};

export type OrderStatusView = {
  orderNumber: string;
  /** orders.status: pending_payment, payment_confirmed, preparing, shipped, delivered, cancelled, refunded, incidence. */
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  amountDueOnline: number | null;
  balanceDue: number;
  deliveryMethod: string;
  paymentMethod: string;
  paymentPlan: string;
  meetingPointDetails: string | null;
  createdAt: string;
  lines: OrderStatusLine[];
  latestPaymentStatus: string | null;
  history: { status: string; at: string }[];
  shipment: { provider: string; trackingNumber: string | null } | null;
};

type OrderRow = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "status"
  | "subtotal"
  | "shipping_cost"
  | "total"
  | "amount_due_online"
  | "balance_due"
  | "shipping_method"
  | "payment_method"
  | "payment_plan"
  | "meeting_point_details"
  | "created_at"
  | "lookup_token_expires_at"
> & {
  order_items: Pick<Tables<"order_items">, "product_name" | "variant_label" | "sku" | "unit_price" | "quantity" | "subtotal">[];
  customers?: { email: string } | null;
};

const ORDER_SELECT =
  "id, order_number, status, subtotal, shipping_cost, total, amount_due_online, balance_due, shipping_method, payment_method, payment_plan, meeting_point_details, created_at, lookup_token_expires_at, order_items ( product_name, variant_label, sku, unit_price, quantity, subtotal )";

async function toStatusView(supabase: GxkSupabaseClient, order: OrderRow): Promise<OrderStatusView> {
  const [paymentRes, historyRes, shipmentRes] = await Promise.all([
    supabase.from("payments").select("status").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("order_status_history").select("status, created_at").eq("order_id", order.id).order("created_at", { ascending: true }),
    supabase
      .from("shipments")
      .select("provider, tracking_number, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (paymentRes.error) throw paymentRes.error;
  if (historyRes.error) throw historyRes.error;
  if (shipmentRes.error) throw shipmentRes.error;

  const shipment = shipmentRes.data && shipmentRes.data.status !== "cancelled" ? shipmentRes.data : null;

  return {
    orderNumber: order.order_number,
    status: order.status,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shipping_cost),
    total: Number(order.total),
    amountDueOnline: order.amount_due_online === null ? null : Number(order.amount_due_online),
    balanceDue: Number(order.balance_due),
    deliveryMethod: order.shipping_method,
    paymentMethod: order.payment_method,
    paymentPlan: order.payment_plan,
    meetingPointDetails: order.meeting_point_details,
    createdAt: order.created_at,
    lines: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variantLabel: item.variant_label,
      sku: item.sku,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineSubtotal: Number(item.subtotal ?? item.unit_price * item.quantity),
    })),
    latestPaymentStatus: paymentRes.data?.status ?? null,
    history: (historyRes.data ?? []).map((entry) => ({ status: entry.status, at: entry.created_at })),
    shipment: shipment ? { provider: shipment.provider, trackingNumber: shipment.tracking_number } : null,
  };
}

/**
 * Pedido por su token de consulta en claro (link de confirmación). `null`
 * si no existe o venció: no se distingue un caso del otro.
 */
export async function getOrderByLookupToken(supabase: GxkSupabaseClient, rawToken: string): Promise<OrderStatusView | null> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("lookup_token_hash", tokenHash)
    .maybeSingle()
    .returns<OrderRow>();
  if (error) throw error;
  if (!order) return null;
  if (order.lookup_token_expires_at && new Date(order.lookup_token_expires_at).getTime() < Date.now()) return null;
  return toStatusView(supabase, order);
}

/**
 * Tracking público (Bible §33) por número de pedido + email del comprador:
 * hacen falta los dos, así un número de pedido solo no expone nada. `null`
 * si no coinciden (sin distinguir cuál falló).
 */
export async function lookupOrderForTracking(
  supabase: GxkSupabaseClient,
  orderNumber: string,
  email: string,
): Promise<OrderStatusView | null> {
  const number = orderNumber.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!number || !normalizedEmail) return null;
  const { data: order, error } = await supabase
    .from("orders")
    .select(`${ORDER_SELECT}, customers ( email )`)
    .eq("order_number", number)
    .maybeSingle()
    .returns<OrderRow>();
  if (error) throw error;
  if (!order || order.customers?.email?.toLowerCase() !== normalizedEmail) return null;
  return toStatusView(supabase, order);
}
