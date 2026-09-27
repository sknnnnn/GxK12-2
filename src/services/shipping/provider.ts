// Abstracción de proveedor logístico. Cada proveedor real (Andreani, Correo
// Argentino) implementa esta interfaz en src/services/shipping/providers/.
//
// Estado de esta etapa: SOLO arquitectura -- tipos e interfaz, sin ninguna
// llamada real a ninguna API todavía. Ningún adapter tiene credenciales;
// ver el archivo de cada proveedor (src/services/shipping/providers/*.ts)
// para el detalle exacto de qué falta confirmar/obtener antes de poder
// implementarlo de verdad.
//
// Fuentes usadas para diseñar esto:
// - Correo Argentino (PAQ.AR API 2.0): manual oficial de usuario (Abril
//   2023, correoargentino.com.ar/MiCorreo/public/img/pag/apiPaqAr-v2.pdf),
//   leído completo -- alta confianza.
// - Andreani: developers.andreani.com / developers-sandbox.andreani.com es
//   una SPA que no se pudo leer completa; lo de acá combina fragmentos
//   propios de su sandbox oficial con corroboración de integraciones de
//   terceros -- confianza media, nunca tomada como fuente de verdad única
//   (ver providers/andreani.ts para el detalle de qué está confirmado y
//   qué no).

export type ShippingProviderId = "andreani" | "correo_argentino";

/**
 * Domicilio postal. `province` es un código de provincia, no el nombre
 * completo -- Correo Argentino documenta una tabla propia de códigos de
 * una letra (ej. "B" = Provincia de Buenos Aires, "C" = CABA); Andreani
 * probablemente use su propia codificación de contrato. La normalización
 * entre esquemas de provincia por proveedor queda para cuando se
 * implemente cada adapter de verdad.
 */
export type ShippingPostalAddress = {
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  locality: string;
  province: string;
  postalCode: string;
};

/**
 * Destino de un envío: domicilio del comprador O sucursal/punto de retiro
 * (`branchId` referencia un id devuelto por `ShippingProvider.listPickupPoints`).
 * Ambos proveedores soportan las dos modalidades -- ver `ShippingCapabilities.branchPickup`.
 */
export type ShippingDestination =
  | { type: "address"; address: ShippingPostalAddress }
  | { type: "branch"; branchId: string };

/**
 * Datos del paquete. Ninguno de los dos proveedores cotiza ni da de alta
 * un envío sin esto -- ver la nota de la etapa sobre products/product_variants
 * sin peso/dimensiones todavía (pendiente real, fuera de alcance acá).
 */
export type ShippingParcel = {
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  declaredValue: number;
};

export type ShippingRecipient = {
  name: string;
  email?: string;
  phone?: string;
};

export type ShippingQuoteInput = {
  /** Domicilio de despacho del comercio (depósito de GXK) -- todavía no definido, ver services/shipping/index.ts. */
  origin: ShippingPostalAddress;
  destination: ShippingDestination;
  parcel: ShippingParcel;
};

export type ShippingQuoteResult = {
  cost: number;
  currency: "ARS";
  estimatedDeliveryDays?: number;
  /** Código de servicio propio del proveedor/contrato (ej. serviceType de Correo Argentino). */
  serviceType?: string;
};

export type CreateShipmentInput = {
  /** Referencia externa (orders.order_number) -- mismo rol que external_reference en services/payments. */
  orderNumber: string;
  origin: ShippingPostalAddress;
  destination: ShippingDestination;
  recipient: ShippingRecipient;
  parcel: ShippingParcel;
  serviceType?: string;
};

export type CreateShipmentResult = {
  /** Identificador del proveedor para este envío -- mapea a shipments.external_id. */
  externalId: string;
  /** Código de seguimiento visible para el comprador -- mapea a shipments.tracking_number (puede coincidir con externalId según el proveedor). */
  trackingNumber: string;
  /**
   * Algunos proveedores procesan la alta en forma asíncrona (la
   * documentación de sandbox de Andreani muestra una respuesta 202
   * Accepted) -- "processing" indica que todavía no hay confirmación
   * definitiva del proveedor, no asumir "created" como estado final único.
   */
  status: "created" | "processing";
  /** Respuesta cruda del proveedor, para debug. No se persiste todavía (shipments no tiene una columna para esto en esta etapa). */
  raw: unknown;
};

export type ShippingLabel = {
  fileBase64: string;
  fileName: string;
  contentType: "application/pdf";
};

export type ShippingTrackingEvent = {
  /** Código crudo del proveedor (ej. "PRE", "CAU" de Correo Argentino) -- sin normalizar todavía a un set propio. */
  status: string;
  statusLabel: string;
  occurredAt: string;
  location?: string;
};

export type ShippingPickupPoint = {
  id: string;
  name: string;
  address: ShippingPostalAddress;
  latitude?: number;
  longitude?: number;
  /** Acepta que el comercio deje ahí el paquete ("imposición" en la terminología de Correo Argentino). */
  acceptsDropoff: boolean;
  /** Acepta que el comprador retire ahí su pedido ("entrega"/retiro). */
  acceptsPickup: boolean;
};

/**
 * Qué soporta realmente cada proveedor -- nunca asumir que todos soportan
 * todo. En particular `quote` es `false` para Correo Argentino: su manual
 * oficial (API 2.0) no incluye ningún endpoint de cotización online (ver
 * providers/correoArgentino.ts) -- el costo para ese proveedor tiene que
 * resolverse de otra forma (tarifario propio a definir con el dueño de
 * GXK), no simulando una cotización que la API no ofrece.
 */
export type ShippingCapabilities = {
  quote: boolean;
  cancelShipment: boolean;
  branchPickup: boolean;
};

/**
 * Los métodos opcionales (`quote?`, `cancelShipment?`, `listPickupPoints?`)
 * solo deben implementarse si `capabilities` declara soporte para ellos.
 * Quien consuma un ShippingProvider debe chequear `capabilities` antes de
 * llamar a un método opcional -- nunca asumir que existe solo porque la
 * interfaz lo permite.
 */
export interface ShippingProvider {
  readonly id: ShippingProviderId;
  readonly capabilities: ShippingCapabilities;

  quote?(input: ShippingQuoteInput): Promise<ShippingQuoteResult>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getLabel(externalId: string): Promise<ShippingLabel>;
  getTracking(externalId: string): Promise<ShippingTrackingEvent[]>;
  cancelShipment?(externalId: string): Promise<void>;
  listPickupPoints?(filter?: { province?: string }): Promise<ShippingPickupPoint[]>;
}

/**
 * Ningún adapter tiene credenciales ni endpoints 100% confirmados todavía
 * -- ver el archivo de cada proveedor para el detalle exacto de qué falta.
 * No es un error de programación: es el estado real hasta que el dueño de
 * GXK provea contrato/credenciales para Andreani y/o Correo Argentino.
 */
export class ShippingProviderNotImplementedError extends Error {
  constructor(providerId: ShippingProviderId, method: string, reason: string) {
    super(`${providerId}.${method} no está implementado todavía: ${reason}`);
    this.name = "ShippingProviderNotImplementedError";
  }
}
