import {
  ShippingProviderNotImplementedError,
  type CreateShipmentInput,
  type CreateShipmentResult,
  type ShippingCapabilities,
  type ShippingLabel,
  type ShippingPickupPoint,
  type ShippingProvider,
  type ShippingTrackingEvent,
} from "../provider";

// Correo Argentino (PAQ.AR API 2.0) -- adapter de ARQUITECTURA únicamente.
// Ningún método hace ni va a hacer una llamada real todavía: todos lanzan
// ShippingProviderNotImplementedError.
//
// CONFIANZA: alta. Fuente: manual oficial "Correo Argentino — Plataforma de
// Integración — Api 2.0 Manual de Usuario" (Abril 2023),
// correoargentino.com.ar/MiCorreo/public/img/pag/apiPaqAr-v2.pdf, leído
// completo.
//
// Endpoints confirmados contra ese manual (host: apitest.correoargentino.com.ar/paqar
// para QA, api.correoargentino.com.ar/paqar para producción):
// - GET   /v1/auth                            -- validar credenciales
// - POST  /v1/orders                          -- alta de orden. OJO: el
//   array `parcels` documentado solo toma el primer elemento aunque se
//   envíen varios -- una orden PAQ.AR es un solo paquete, no un carrito.
// - PATCH /v1/orders/{trackingNumber}/cancel  -- cancelar (solo funciona
//   antes de la "imposición" física del paquete; la respuesta de éxito
//   literalmente dice "Pedido Cancelado - No fue impuesto")
// - POST  /v1/labels                          -- rótulo en PDF (fileBase64),
//   acepta un array de {sellerId, trackingNumber} en un solo llamado
// - GET   /v1/tracking                        -- historial de eventos,
//   acepta varios trackingNumber en un solo llamado
// - GET   /v1/agencies                        -- sucursales, filtra por
//   provincia (stateId) y disponibilidad de entrega/imposición
//
// Auth: headers "Authorization: Apikey <Key>" + "agreement: <id>" (código
// de acuerdo comercial numérico, provisto por el área Comercial de Correo
// Argentino). Sin credenciales propias todavía.
//
// NO CONFIRMADO / sin resolver: este manual NO documenta ningún endpoint de
// cotización online -- por eso capabilities.quote = false. El costo del
// envío para este proveedor tiene que resolverse de otra forma (tarifario
// propio pactado comercialmente, tabla por peso/zona, u otro mecanismo que
// no esté cubierto por este manual v2) -- pendiente de confirmar con el
// dueño de GXK, no algo que podamos inventar acá.
//
// Lo que falta del dueño de GXK antes de poder implementar esto de verdad:
// - Alta comercial con el área Comercial de Correo Argentino.
// - `agreement` (id de acuerdo) + API-Key, y sus equivalentes de QA.
// - Límites reales de peso/dimensiones de su contrato (el manual da un
//   ejemplo de OTRO cliente -- "para cliente 18018 el máximo es 25000"
//   gramos -- no es un valor genérico aplicable a GXK).
// - Código(s) de `serviceType` (2 letras) que correspondan a su cuenta.
// - Cómo calculan el costo del envío (ver "NO CONFIRMADO" arriba).
export const CORREO_ARGENTINO_CAPABILITIES: ShippingCapabilities = {
  quote: false,
  cancelShipment: true,
  branchPickup: true,
};

export class CorreoArgentinoShippingProvider implements ShippingProvider {
  readonly id = "correo_argentino" as const;
  readonly capabilities = CORREO_ARGENTINO_CAPABILITIES;

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void input;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "createShipment",
      "POST /v1/orders confirmado contra el manual oficial, pero sin agreement/API-Key todavía",
    );
  }

  async getLabel(externalId: string): Promise<ShippingLabel> {
    void externalId;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getLabel",
      "POST /v1/labels confirmado contra el manual oficial, pero sin agreement/API-Key todavía",
    );
  }

  async getTracking(externalId: string): Promise<ShippingTrackingEvent[]> {
    void externalId;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getTracking",
      "GET /v1/tracking confirmado contra el manual oficial, pero sin agreement/API-Key todavía",
    );
  }

  async cancelShipment(externalId: string): Promise<void> {
    void externalId;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "cancelShipment",
      "PATCH /v1/orders/{trackingNumber}/cancel confirmado contra el manual oficial (solo funciona antes de la imposición física del paquete), pero sin agreement/API-Key todavía",
    );
  }

  async listPickupPoints(filter?: { province?: string }): Promise<ShippingPickupPoint[]> {
    void filter;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "listPickupPoints",
      "GET /v1/agencies confirmado contra el manual oficial, pero sin agreement/API-Key todavía",
    );
  }
}
