// Abstracción de proveedor logístico. Cada proveedor real (Andreani, Correo
// Argentino) implementa esta interfaz en src/services/shipping/providers/.
//
// Estado (PRO-126): Correo Argentino (providers/correoArgentino.ts) ya hace
// llamadas HTTP reales contra su API oficial (PAQ.AR API 2.0) para
// listPickupPoints/getLabel/getTracking/cancelShipment -- createShipment
// queda con un límite puntual documentado en ese archivo. Andreani
// (providers/andreani.ts) sigue siendo solo arquitectura: ningún endpoint
// suyo está confirmado todavía, ver el detalle en ese archivo.
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
 *
 * `kind` ("agency" | "locker") existe porque Correo Argentino distingue
 * ambas modalidades como valores de `deliveryType` distintos en POST
 * /v1/orders (ver providers/correoArgentino.ts) y GET /v1/agencies no
 * devuelve ningún campo que permita inferir esto a partir de `branchId` --
 * es una decisión de negocio de quien arma el envío, no algo derivable.
 */
export type ShippingDestination =
  | { type: "address"; address: ShippingPostalAddress }
  | { type: "branch"; branchId: string; kind: "agency" | "locker" };

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

/**
 * Línea de pedido con los datos físicos del producto (PRO-127: products.weight_grams/
 * length_cm/width_cm/height_cm), tal como los necesita `resolveShippingParcel`
 * (src/services/shipping/index.ts) para construir un `ShippingParcel` antes de
 * llamar a un `ShippingProvider`. Nunca viene del navegador -- lo arma quien
 * resuelva el pedido contra el catálogo (fuera de alcance de PRO-125: la
 * orquestación real pedido -> parcel es de una etapa futura, ver PRO-126/128).
 */
export type ShippableOrderItem = {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

/**
 * Un producto de `ShippableOrderItem` todavía no tiene cargado alguno de sus
 * datos físicos (PRO-127 los deja NULL a propósito hasta que se cargan desde
 * Admin Productos -- nunca hay que inventarlos). Lista TODOS los productos
 * con datos faltantes de una sola vez (no solo el primero) para que se
 * puedan corregir en un solo paso antes de reintentar.
 */
export class ShippingMissingPhysicalDataError extends Error {
  constructor(
    public readonly items: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      missingFields: Array<"weightGrams" | "lengthCm" | "widthCm" | "heightCm">;
    }>,
  ) {
    const detail = items
      .map((item) => `${item.productName}${item.sku ? ` (${item.sku})` : ""}: falta ${item.missingFields.join(", ")}`)
      .join("; ");
    super(`Faltan datos físicos de envío para poder armar el paquete -- ${detail}`);
    this.name = "ShippingMissingPhysicalDataError";
  }
}

/**
 * `resolveShippingParcel` solo arma un `ShippingParcel` para el caso simple
 * (un único producto, cantidad 1): cómo consolidar varios productos/unidades
 * en uno o más bultos depende de reglas de empaquetado propias de cada
 * transportista que todavía no confirmamos para Andreani (ver
 * providers/andreani.ts) -- inventar una (sumar pesos, tomar el máximo de
 * cada dimensión, etc.) sería una regla comercial no confirmada, no un
 * cálculo neutral. Se lanza este error en vez de adivinar.
 */
export class ShippingPackagingNotSupportedError extends Error {
  constructor(reason: string) {
    super(`No se puede armar un único paquete para este pedido todavía: ${reason}`);
    this.name = "ShippingPackagingNotSupportedError";
  }
}

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
  /**
   * Datos de contacto del remitente (el comercio, GXK) -- Correo Argentino
   * (senderData.businessName, ver providers/correoArgentino.ts) lo pide
   * como dato obligatorio separado de la dirección. No estaba modelado
   * porque hasta PRO-126 ningún adapter llegaba a necesitarlo de verdad.
   */
  originContact: ShippingRecipient;
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
  /** Dato real devuelto por GET /v1/agencies (Correo Argentino) cuando está disponible -- útil para elegir sucursal. */
  phone?: string;
  /** Idem, texto libre tal como lo devuelve la API (ej. "LUN A VIE 08.00 A 14.30") -- no se parsea a una estructura propia. */
  schedule?: string;
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
