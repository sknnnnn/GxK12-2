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

// Andreani -- adapter de ARQUITECTURA. Ningún método hace todavía una
// llamada real: todos lanzan AndreaniNotConfiguredError (si faltan las env
// vars) o ShippingProviderNotImplementedError (si el endpoint/contrato real
// no está confirmado) -- nunca un fetch.
//
// AUDITORÍA (PRO-125), releída/actualizada sobre la nota original de la
// etapa de arquitectura:
//
// - developers.andreani.com y developers-sandbox.andreani.com siguen siendo
//   una SPA que no se puede leer por fetch automatizado (confirmado de
//   nuevo en esta etapa: la página devuelve el shell vacío, sin contenido).
//   No hay forma de leer la documentación oficial completa sin credenciales
//   propias y acceso real al portal.
// - Única fuente adicional nueva revisada en esta etapa: un mirror
//   comunitario no oficial (alejoasotelo.github.io/andreani-api-docs, que
//   el propio sitio aclara "no es la documentación oficial de Andreani").
//   Da un base URL (https://apis.andreani.com), un endpoint de login
//   (GET /v1/login, Basic Auth -> JWT Bearer) y de cotización (GET
//   /v1/tarifas, con cpDestino + contrato como parámetros documentados ahí
//   -- sin peso/dimensiones, lo cual es sospechoso para un endpoint de
//   tarifas y sugiere que esa página está incompleta, no que el endpoint
//   real ignore el peso). CONFIANZA: baja/media -- corrobora en la misma
//   dirección que la nota original (JWT vía login previo), pero sigue
//   siendo una fuente no oficial y con huecos; no se usa para implementar
//   ninguna llamada real, solo se deja documentado acá.
// - Conclusión de la auditoría: ningún endpoint de Andreani llega al nivel
//   de confianza de Correo Argentino (manual oficial completo, ver
//   correoArgentino.ts). Por eso NINGÚN método de este adapter hace fetch
//   todavía -- implementar la llamada real sobre una fuente no oficial
//   sería inventar el contrato, no confirmarlo.
//
// Lo que sabemos con relativa confianza (no verificado oficialmente):
// - Auth: probablemente Bearer token (JWT) vía un login previo (usuario +
//   contraseña, posiblemente Basic Auth), no un API-key estático simple
//   como Correo Argentino. Portales de alta distintos según tipo de
//   cliente: pymes.andreani.com/integraciones vs corporativo.andreani.com.
// - Cotización, alta de orden, sucursales y tracking existen como
//   capacidades (mencionadas de forma consistente en múltiples fuentes),
//   pero no pudimos confirmar sus paths/shapes exactos desde una fuente
//   oficial.
// - La documentación de su propio sandbox muestra que la alta de una orden
//   responde 202 Accepted -- sugiere procesamiento asincrónico (de ahí que
//   CreateShipmentResult.status admita "processing", ver ../provider.ts).
// - Requiere código de contrato + tipo de servicio + sucursal de cliente
//   específicos de la cuenta para cotizar/dar de alta -- los valores
//   concretos dependen enteramente del contrato que le den al dueño de GXK,
//   no son genéricos ni inventables.
// - Domicilio O sucursal para origen Y destino (de ahí branchPickup: true).
// - Cancelación: no encontramos evidencia ni a favor ni en contra --
//   se trata como NO soportada (capabilities.cancelShipment = false) hasta
//   confirmar, en vez de asumir que existe.
//
// Lo que falta del dueño de GXK antes de poder implementar esto de verdad:
// - Ser cliente de Andreani con contrato vigente.
// - Credenciales de acceso a developers.andreani.com / su sandbox (el
//   mecanismo exacto de autenticación depende de lo que confirme su
//   ejecutivo de cuenta -- API-key, usuario/contraseña, o algo distinto).
// - Código(s) de contrato/servicio/sucursal de cliente reales de su cuenta.
// - Confirmar si tienen cancelación disponible y, si la hay, su endpoint.
export const ANDREANI_CAPABILITIES: ShippingCapabilities = {
  quote: true,
  cancelShipment: false,
  branchPickup: true,
};

/**
 * ANDREANI_API_URL/ANDREANI_API_KEY (.env.example) no están configuradas.
 * Estado esperado hasta que el dueño de GXK sea cliente de Andreani y
 * cargue sus credenciales -- nunca hay que simular una respuesta. El
 * nombre exacto de las credenciales reales (API-key vs usuario/contraseña/
 * contrato, ver auditoría arriba) todavía no está confirmado: estas dos
 * env vars son un placeholder reservado desde la etapa de arquitectura,
 * puede que haga falta ampliarlas cuando se confirme el mecanismo real.
 */
export class AndreaniNotConfiguredError extends Error {
  constructor() {
    super("ANDREANI_API_URL/ANDREANI_API_KEY no están configuradas");
    this.name = "AndreaniNotConfiguredError";
  }
}

function getAndreaniConfig(): { apiUrl: string; apiKey: string } {
  const apiUrl = process.env.ANDREANI_API_URL;
  const apiKey = process.env.ANDREANI_API_KEY;
  if (!apiUrl || !apiKey) throw new AndreaniNotConfiguredError();
  return { apiUrl, apiKey };
}

export type AndreaniErrorKind =
  | "authentication"
  | "invalid_data"
  | "not_found"
  | "quote_unavailable"
  | "temporary"
  | "provider_error";

/**
 * Clasifica por código HTTP estándar -- no por el shape de la respuesta de
 * Andreani (eso no está confirmado, ver auditoría arriba). "quote_unavailable"
 * queda en el tipo para cuando se confirme cómo lo señaliza Andreani (¿un
 * código de negocio propio en el body?), pero esta función todavía no lo
 * puede derivar de un status HTTP genérico.
 */
export function classifyAndreaniHttpStatus(status: number): AndreaniErrorKind {
  if (status === 401 || status === 403) return "authentication";
  if (status === 400 || status === 422) return "invalid_data";
  if (status === 404) return "not_found";
  if (status === 429 || status === 503) return "temporary";
  if (status >= 500) return "provider_error";
  return "provider_error";
}

/**
 * Error normalizado de la API de Andreani. Ningún método de este adapter
 * hace fetch todavía (ver auditoría arriba) -- esta clase existe para que,
 * en cuanto se conecte la llamada real, cada método pueda envolver su
 * respuesta de error acá en vez de duplicar la clasificación.
 */
export class AndreaniApiError extends Error {
  readonly kind: AndreaniErrorKind;

  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const kind = classifyAndreaniHttpStatus(status);
    super(`Andreani API error (HTTP ${status}, kind=${kind})`);
    this.name = "AndreaniApiError";
    this.kind = kind;
  }
}

export class AndreaniShippingProvider implements ShippingProvider {
  readonly id = "andreani" as const;
  readonly capabilities = ANDREANI_CAPABILITIES;

  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
    void input;
    getAndreaniConfig();
    throw new ShippingProviderNotImplementedError(
      this.id,
      "quote",
      "endpoint de tarifas no confirmado contra documentación oficial de Andreani (ver auditoría en este archivo); sin credenciales propias todavía",
    );
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void input;
    getAndreaniConfig();
    throw new ShippingProviderNotImplementedError(
      this.id,
      "createShipment",
      "shape de alta de orden no confirmado al 100% (se observó una respuesta 202 async en su sandbox, pero no el contrato completo); sin credenciales propias todavía",
    );
  }

  async getLabel(externalId: string): Promise<ShippingLabel> {
    void externalId;
    getAndreaniConfig();
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getLabel",
      "no confirmamos si la etiqueta viaja en la respuesta de alta o requiere un endpoint separado; sin credenciales propias todavía",
    );
  }

  async getTracking(externalId: string): Promise<ShippingTrackingEvent[]> {
    void externalId;
    getAndreaniConfig();
    throw new ShippingProviderNotImplementedError(
      this.id,
      "getTracking",
      "endpoint de tracking no confirmado contra documentación oficial de Andreani; sin credenciales propias todavía",
    );
  }

  async listPickupPoints(filter?: { province?: string }): Promise<ShippingPickupPoint[]> {
    void filter;
    getAndreaniConfig();
    throw new ShippingProviderNotImplementedError(
      this.id,
      "listPickupPoints",
      "endpoint de sucursales no confirmado contra documentación oficial de Andreani; sin credenciales propias todavía",
    );
  }
}
