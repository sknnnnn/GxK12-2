import {
  ShippingProviderNotImplementedError,
  type CreateShipmentInput,
  type CreateShipmentResult,
  type ShippingCapabilities,
  type ShippingLabel,
  type ShippingPickupPoint,
  type ShippingProvider,
  type ShippingQuoteInput,
  type ShippingQuoteResult,
  type ShippingTrackingEvent,
} from "../provider";

// Andreani -- adapter de ARQUITECTURA únicamente. Ningún método hace ni va
// a hacer una llamada real todavía: todos lanzan ShippingProviderNotImplementedError.
//
// CONFIANZA: media. developers.andreani.com y developers-sandbox.andreani.com
// son una SPA que no se pudo leer completa por fetch automatizado. Lo de
// acá combina fragmentos propios de su sandbox oficial con corroboración
// de múltiples integraciones de terceros (plugins WooCommerce, SDKs
// comunitarios) -- nunca tomado como fuente de verdad única. Nada de esto
// debe tratarse como contrato confirmado hasta tener acceso real al portal
// de desarrolladores con credenciales propias.
//
// Lo que sabemos con relativa confianza (no 100% verificado):
// - Auth: Bearer token (JWT), probablemente vía un login previo con
//   usuario/contraseña + código de cliente -- NO un API-key estático simple
//   como Correo Argentino. Existen portales de alta distintos según tipo de
//   cliente: pymes.andreani.com/integraciones vs corporativo.andreani.com.
// - Cotización, alta de orden, sucursales y tracking existen como
//   capacidades (mencionadas de forma consistente en múltiples fuentes),
//   pero no pudimos confirmar sus paths/shapes exactos desde la fuente
//   oficial.
// - La documentación de su propio sandbox muestra que la alta de una orden
//   responde 202 Accepted -- sugiere procesamiento asincrónico (de ahí que
//   CreateShipmentResult.status admita "processing", ver ../provider.ts).
// - Requiere código de contrato + tipo de servicio + sucursal de cliente
//   específicos de la cuenta para cotizar/dar de alta -- los valores
//   concretos dependen enteramente del contrato que le den al dueño de GXK,
//   no son genéricos ni inventables.
// - Domicilio O sucursal para origen Y destino (de ahí branchPickup: true).
// - Cancelación: no encontramos evidencia ni a favor ni en contra en lo que
//   pudimos leer -- se trata como NO soportada (capabilities.cancelShipment
//   = false) hasta confirmar, en vez de asumir que existe.
//
// Lo que falta del dueño de GXK antes de poder implementar esto de verdad:
// - Ser cliente de Andreani con contrato vigente.
// - Credenciales de acceso a developers.andreani.com / su sandbox (el
//   mecanismo exacto de autenticación depende de lo que confirme su
//   ejecutivo de cuenta).
// - Código(s) de contrato/servicio reales de su cuenta.
// - Confirmar si tienen cancelación disponible y, si la hay, su endpoint.
export const ANDREANI_CAPABILITIES: ShippingCapabilities = {
  quote: true,
  cancelShipment: false,
  branchPickup: true,
};

export class AndreaniShippingProvider implements ShippingProvider {
  readonly id = "andreani" as const;
  readonly capabilities = ANDREANI_CAPABILITIES;

  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
    void input;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "quote",
      "endpoint de tarifas no confirmado contra documentación oficial de Andreani; sin credenciales todavía",
    );
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void input;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "createShipment",
      "shape de alta de orden no confirmado al 100% (se observó una respuesta 202 async en su sandbox, pero no el contrato completo); sin credenciales todavía",
    );
  }

  async getLabel(externalId: string): Promise<ShippingLabel> {
    void externalId;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getLabel",
      "no confirmamos si la etiqueta viaja en la respuesta de alta o requiere un endpoint separado; sin credenciales todavía",
    );
  }

  async getTracking(externalId: string): Promise<ShippingTrackingEvent[]> {
    void externalId;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getTracking",
      "endpoint de tracking no confirmado contra documentación oficial de Andreani; sin credenciales todavía",
    );
  }

  async listPickupPoints(filter?: { province?: string }): Promise<ShippingPickupPoint[]> {
    void filter;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "listPickupPoints",
      "endpoint de sucursales no confirmado contra documentación oficial de Andreani; sin credenciales todavía",
    );
  }
}
