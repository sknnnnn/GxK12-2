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
// Estado de esta etapa: SOLO arquitectura. getShippingProvider ya permite
// que el checkout (en una etapa futura) trabaje contra "un ShippingProvider"
// sin acoplarse a Andreani o Correo Argentino directamente -- pero ningún
// adapter tiene todavía credenciales ni llama a una API real (ver
// src/services/shipping/providers/**, cada uno documenta exactamente qué
// falta confirmar/obtener de cada proveedor).
//
// Nota para cuando se integre un proveedor real: la creación del envío
// (createShipment) debe dispararse recién cuando orders.status pasa a
// 'payment_confirmed' (ver services/payments.recordPaymentResult), nunca
// desde el checkout -- no tiene sentido reservarle un envío a Andreani o
// Correo Argentino para un pedido que todavía puede no pagarse.

import { AndreaniShippingProvider } from "./providers/andreani";
import { CorreoArgentinoShippingProvider } from "./providers/correoArgentino";
import type { ShippingProvider, ShippingProviderId } from "./provider";

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
