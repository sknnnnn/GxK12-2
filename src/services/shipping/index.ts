// Shipping: selección de proveedor logístico y (a futuro) orquestación de
// cotización, alta de envío, etiqueta y tracking.
// Proveedores: Andreani y Correo Argentino (ver src/services/shipping/provider.ts
// y src/services/shipping/providers/**).
//
// Convención de GXK Core (src/services/**): cada función recibe un
// GxkSupabaseClient (src/lib/supabase/types.ts) ya autenticado como
// parámetro, en vez de construir su propio cliente o depender de APIs de
// Next.js. Así la misma función sirve desde Storefront, Admin Web o, más
// adelante, Desktop — ver ARCHITECTURE.md. getShippingProvider es una
// excepción esperada: es un selector puro (sin acceso a datos), no necesita
// cliente.
//
// Estado (PRO-128): el flujo ya está conectado de punta a punta --
// - Proveedor activo, costo fijo y datos de despacho: ./settings.ts
//   (tabla shipping_settings, editable desde Admin > Configuración).
// - Alta del envío recién con el pago confirmado (webhook de Mercado Pago),
//   idempotente y sin tocar pago/stock si falla: ./shipments.ts
//   (se importa desde "@/services/shipping/shipments", no se re-exporta
//   acá para no generar un import circular).
// Lo que sigue bloqueado es la llamada real de cada adapter
// (src/services/shipping/providers/**): credenciales y contratos de GXK
// con Andreani/Correo Argentino.

import { AndreaniShippingProvider } from "./providers/andreani";
import { CorreoArgentinoShippingProvider } from "./providers/correoArgentino";
import {
  ShippingMissingPhysicalDataError,
  ShippingPackagingNotSupportedError,
  type ShippableOrderItem,
  type ShippingParcel,
  type ShippingProvider,
  type ShippingProviderId,
} from "./provider";

export * from "./settings";
export * from "./delivery";

const providers: Record<ShippingProviderId, ShippingProvider> = {
  andreani: new AndreaniShippingProvider(),
  correo_argentino: new CorreoArgentinoShippingProvider(),
};

/**
 * Devuelve el adapter correspondiente sin que quien llama conozca la clase
 * concreta -- así el checkout (a futuro) puede trabajar con "un
 * ShippingProvider" sin acoplarse a Andreani o Correo Argentino. Ningún
 * adapter llama todavía a una API real (ver src/services/shipping/providers/**);
 * cada método de cada uno lanza ShippingProviderNotImplementedError.
 */
export function getShippingProvider(id: ShippingProviderId): ShippingProvider {
  return providers[id];
}

// ----------------------------------------------------------------------------
// resolveShippingParcel (PRO-125 §5/§14) -- traduce productos del catálogo
// (con sus datos físicos de PRO-127) a un ShippingParcel, que es lo que
// espera ShippingProvider.quote/createShipment. La llama
// shipments.ensureShipmentForPaidOrder (PRO-128) con los order_items +
// products del pedido ya pagado. Se agregó antes que esa orquestación porque el
// chequeo de "faltan datos físicos" tiene que existir ANTES de esa
// orquestación, no dentro de cada adapter (ShippingParcel ya llega con
// números no-nulos por tipo -- para cuando un provider la recibe, ya tiene
// que estar resuelta).
// ----------------------------------------------------------------------------

/**
 * Arma el ShippingParcel de un pedido a partir de sus productos. Valida
 * TODOS los productos antes de intentar nada (si falta algún dato físico,
 * lanza ShippingMissingPhysicalDataError listando cada uno -- nunca inventa
 * un valor). Solo soporta hoy el caso de un único producto en cantidad 1:
 * cómo consolidar varios productos/unidades en uno o más bultos es una
 * regla de empaquetado propia de cada transportista que todavía no
 * confirmamos para Andreani (ver providers/andreani.ts) -- para cualquier
 * otro caso lanza ShippingPackagingNotSupportedError en vez de inventar esa
 * regla.
 */
export function resolveShippingParcel(items: ShippableOrderItem[]): ShippingParcel {
  const missing = items
    .map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      missingFields: (
        [
          ["weightGrams", item.weightGrams],
          ["lengthCm", item.lengthCm],
          ["widthCm", item.widthCm],
          ["heightCm", item.heightCm],
        ] as const
      )
        .filter(([, value]) => value === null)
        .map(([field]) => field),
    }))
    .filter((item) => item.missingFields.length > 0);

  if (missing.length > 0) {
    throw new ShippingMissingPhysicalDataError(missing);
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  if (items.length !== 1 || totalUnits !== 1) {
    throw new ShippingPackagingNotSupportedError(
      "el pedido tiene más de un producto o más de una unidad -- falta confirmar con Andreani cómo consolidan varios productos/unidades en uno o más bultos",
    );
  }

  const [item] = items;
  return {
    weightGrams: item.weightGrams!,
    // ShippingParcel.depthCm (src/services/shipping/provider.ts, etapa
    // anterior) corresponde a products.length_cm (PRO-127) -- mismo dato
    // físico, nombre distinto entre el catálogo y el modelo de Shipping.
    depthCm: item.lengthCm!,
    widthCm: item.widthCm!,
    heightCm: item.heightCm!,
    declaredValue: item.unitPrice * item.quantity,
  };
}
