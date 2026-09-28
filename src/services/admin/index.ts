// Admin: operaciones privilegiadas de gestión de catálogo, pedidos, envíos y outfits.
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Admin Web o, más adelante,
// Desktop — ver ARCHITECTURE.md.
//
// Este es el módulo que Admin Web y Desktop comparten más directamente: la
// regla de negocio (qué puede editarse, qué queda solo-lectura, qué
// requiere confirmación) vive acá una sola vez, gateada por RLS a través
// del cliente de sesión del administrador (createSupabaseServerClient en
// Next.js; el equivalente autenticado que use Desktop). Ninguna de las dos
// interfaces debe reimplementar estas reglas por su cuenta.
//
// Todas las funciones de acá reciben el cliente de SESIÓN del admin (no el
// admin/service-role): las policies admin_* de cada tabla ya restringen la
// lectura a "authenticated + fila activa en admins" -- son la barrera real,
// no una conveniencia. getCurrentAdmin en particular ES esa verificación:
// úsese siempre antes de mostrar cualquier pantalla de Admin Web (ver
// src/app/admin/(protected)/layout.tsx).

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { Tables } from "@/types/database";
// LOW_STOCK_THRESHOLD vive en inventory.ts (una sola fuente de verdad,
// reutilizada acá para getDashboardSummary/getStockAlerts).
import { LOW_STOCK_THRESHOLD } from "./inventory";

// Gestión de catálogo (productos/variantes/imágenes), inventario y pedidos
// viven en su propio archivo por tamaño -- siguen siendo el mismo módulo
// services/admin.
export * from "./products";
export * from "./inventory";
export * from "./orders";

// Pedidos considerados "venta" para el total de Ventas del dashboard:
// pending_payment (todavía no pagó) y cancelled/refunded (no se concretó o
// se devolvió el dinero) quedan afuera a propósito.
const SALE_COUNTED_ORDER_STATUSES = ["payment_confirmed", "preparing", "shipped", "delivered"];

export type AdminProfile = {
  id: string;
  email: string;
  fullName: string | null;
};

/**
 * Admin autenticado y activo para la sesión actual, o `null` si no hay
 * sesión, si el usuario no tiene fila en `admins`, o si esa fila no está
 * activa. Esta es LA verificación de autorización de Admin Web -- toda
 * pantalla administrativa debe pasar por acá (o por un layout que ya lo
 * haya hecho) antes de mostrar nada.
 */
export async function getCurrentAdmin(supabase: GxkSupabaseClient): Promise<AdminProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!admin || !admin.is_active) return null;

  return { id: admin.id, email: user.email ?? "", fullName: admin.full_name };
}

export type DashboardSummary = {
  pendingPaymentOrders: number;
  /** Pedidos en payment_confirmed: pagados, todavía sin pasar a "preparando". */
  paidAwaitingShipmentOrders: number;
  /** Envíos cuya alta en el proveedor falló (shipments.status = 'failed', ver services/shipping/shipments). */
  failedShipments: number;
  totalSalesAmount: number;
  lowStockCount: number;
  outOfStockCount: number;
};

/**
 * Métricas de resumen del dashboard. Todo sale de conteos/sumas reales
 * (orders.status, product_variants.stock) -- nada hardcodeado.
 */
export async function getDashboardSummary(supabase: GxkSupabaseClient): Promise<DashboardSummary> {
  const [pendingCount, paidCount, failedShipmentsCount, salesRows, stockRows] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "payment_confirmed"),
    supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("orders").select("total").in("status", SALE_COUNTED_ORDER_STATUSES),
    supabase.from("product_variants").select("stock").eq("is_active", true).lte("stock", LOW_STOCK_THRESHOLD),
  ]);

  if (pendingCount.error) throw pendingCount.error;
  if (paidCount.error) throw paidCount.error;
  if (failedShipmentsCount.error) throw failedShipmentsCount.error;
  if (salesRows.error) throw salesRows.error;
  if (stockRows.error) throw stockRows.error;

  const totalSalesAmount = (salesRows.data ?? []).reduce((sum, row) => sum + row.total, 0);
  const stocks = (stockRows.data ?? []).map((row) => row.stock);

  return {
    pendingPaymentOrders: pendingCount.count ?? 0,
    paidAwaitingShipmentOrders: paidCount.count ?? 0,
    failedShipments: failedShipmentsCount.count ?? 0,
    totalSalesAmount,
    lowStockCount: stocks.filter((stock) => stock > 0).length,
    outOfStockCount: stocks.filter((stock) => stock === 0).length,
  };
}

export type RecentOrderRow = {
  /** orders.id -- para linkear al detalle en Admin (/admin/pedidos/[id]). */
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string | null;
  total: number;
  status: string;
  latestPaymentStatus: string | null;
};

type RecentOrderQueryRow = Pick<Tables<"orders">, "id" | "order_number" | "created_at" | "total" | "status"> & {
  customers: Pick<Tables<"customers">, "name"> | null;
};

/**
 * Últimos pedidos, con el estado del pago más reciente de cada uno. No hay
 * forma limpia de traer "el último pago por pedido" en un solo select de
 * PostgREST sin una vista/función nueva (fuera de alcance acá) -- se trae
 * el listado de pagos de estos pedidos y se resuelve el más reciente por
 * pedido en el propio servicio.
 */
export async function getRecentOrders(supabase: GxkSupabaseClient, limit = 10): Promise<RecentOrderRow[]> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, total, status, customers ( name )")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentOrderQueryRow[]>();

  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  const { data: paymentRows, error: paymentsError } = await supabase
    .from("payments")
    .select("order_id, status, created_at")
    .in(
      "order_id",
      orders.map((order) => order.id),
    )
    .order("created_at", { ascending: false });

  if (paymentsError) throw paymentsError;

  const latestPaymentByOrder = new Map<string, string>();
  for (const payment of paymentRows ?? []) {
    if (!latestPaymentByOrder.has(payment.order_id)) {
      latestPaymentByOrder.set(payment.order_id, payment.status);
    }
  }

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    customerName: order.customers?.name ?? null,
    total: order.total,
    status: order.status,
    latestPaymentStatus: latestPaymentByOrder.get(order.id) ?? null,
  }));
}

export type StockAlertVariant = {
  productId: string;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  stock: number;
};

export type StockAlerts = {
  lowStock: StockAlertVariant[];
  outOfStock: StockAlertVariant[];
};

type StockAlertQueryRow = Pick<Tables<"product_variants">, "product_id" | "sku" | "stock"> & {
  products: Pick<Tables<"products">, "name"> | null;
  sizes: Pick<Tables<"sizes">, "name"> | null;
  colors: Pick<Tables<"colors">, "name"> | null;
};

/**
 * Variantes activas con stock <= LOW_STOCK_THRESHOLD, separadas en "stock
 * bajo" (> 0) y "agotado" (= 0). No filtra por products.status a propósito:
 * un producto en draft/hidden con poco stock sigue siendo información de
 * inventario accionable para el admin.
 */
export async function getStockAlerts(supabase: GxkSupabaseClient): Promise<StockAlerts> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id, sku, stock, products ( name ), sizes ( name ), colors ( name )")
    .eq("is_active", true)
    .lte("stock", LOW_STOCK_THRESHOLD)
    .order("stock", { ascending: true })
    .returns<StockAlertQueryRow[]>();

  if (error) throw error;

  const variants: StockAlertVariant[] = (data ?? []).map((row) => ({
    productId: row.product_id,
    productName: row.products?.name ?? "Producto sin nombre",
    variantLabel: [row.sizes?.name, row.colors?.name].filter(Boolean).join(" / ") || null,
    sku: row.sku,
    stock: row.stock,
  }));

  return {
    lowStock: variants.filter((variant) => variant.stock > 0),
    outOfStock: variants.filter((variant) => variant.stock === 0),
  };
}
