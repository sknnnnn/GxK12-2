import "server-only";
import {
  ShippingProviderNotImplementedError,
  type CreateShipmentInput,
  type CreateShipmentResult,
  type ShippingCapabilities,
  type ShippingLabel,
  type ShippingPickupPoint,
  type ShippingPostalAddress,
  type ShippingProvider,
  type ShippingTrackingEvent,
} from "../provider";

// Correo Argentino (PAQ.AR API 2.0).
//
// CONFIANZA: alta. Fuente: manual oficial "Correo Argentino — Plataforma de
// Integración — Api 2.0 Manual de Usuario" (Abril 2023),
// correoargentino.com.ar/MiCorreo/public/img/pag/apiPaqAr-v2.pdf, releído
// completo y en detalle para PRO-126 (37 páginas, extraído con pdftotext
// -layout para poder citarlo textualmente más abajo).
//
// Endpoints confirmados contra ese manual (host: apitest.correoargentino.com.ar/paqar
// para QA, api.correoargentino.com.ar/paqar para producción):
// - GET   /v1/auth                            -- validar credenciales (204 sin body)
// - GET   /v1/agencies                        -- sucursales
// - POST  /v1/orders                          -- alta de orden. El array
//   `parcels` documentado solo toma el primer elemento aunque se envíen
//   varios ("Solo tomará un producto... se ignoran los siguientes") -- una
//   orden PAQ.AR es un solo paquete, no un carrito (ver resolveShippingParcel,
//   services/shipping/index.ts, que ya modela exactamente este límite).
// - PATCH /v1/orders/{trackingNumber}/cancel  -- cancelar (solo funciona
//   antes de la "imposición" física del paquete; la respuesta de éxito
//   literalmente dice "Pedido Cancelado - No fue impuesto"). El manual
//   confirma el endpoint y sus condiciones -- por eso `capabilities.cancelShipment: true`.
// - POST  /v1/labels                          -- rótulo en PDF (fileBase64),
//   acepta un array de {sellerId, trackingNumber} en un solo llamado
// - GET   /v1/tracking                        -- historial de eventos,
//   acepta varios trackingNumber en un solo llamado (nuestra interfaz solo
//   pide uno por vez, ver getTracking)
//
// Auth: headers "Authorization: Apikey <Key>" + "agreement: <id>" (código de
// acuerdo comercial numérico, provisto por el área Comercial de Correo
// Argentino). Las credenciales viven en CORREO_ARGENTINO_API_KEY /
// CORREO_ARGENTINO_AGREEMENT (.env.example) -- nunca hardcodeadas. Las URLs
// de QA/producción SÍ están hardcodeadas (CORREO_ARGENTINO_BASE_URL más
// abajo): son públicas y fijas según el propio manual, no un secreto ni un
// dato que dependa de la cuenta -- se seleccionan con CORREO_ARGENTINO_ENVIRONMENT
// ("qa" | "production"), mismo criterio que MERCADO_PAGO_ACCESS_TOKEN/
// MP_API_BASE en src/lib/mercadopago/client.ts.
//
// NO CONFIRMADO / sin resolver -- pendiente real de GXK, no inventado:
// - Este manual NO documenta ningún endpoint de cotización online -- por
//   eso capabilities.quote = false. El costo del envío para este proveedor
//   tiene que resolverse de otra forma (tarifario propio pactado
//   comercialmente, tabla por peso/zona, u otro mecanismo que no esté
//   cubierto por este manual v2) -- pendiente de confirmar con el dueño de
//   GXK, no algo que podamos inventar acá.
// - `parcels[].productCategory` aparece en el payload de alta de orden (con
//   el valor de ejemplo literal "categoria ejemplo") pero el manual NUNCA
//   documenta qué valores son válidos ni su propósito -- a diferencia de
//   cada otro campo del payload, no tiene su propia sección en
//   "Validaciones y definiciones". No tenemos un dato equivalente en
//   nuestro catálogo/pedido tampoco. `createShipment` llega a construir
//   todo el resto del payload real y se detiene justo en este campo (ver
//   más abajo) en vez de inventar un valor.
// - `senderData.businessName`/teléfono/email del REMITENTE (GXK) no forman
//   parte del contrato compartido `CreateShipmentInput` hasta esta etapa --
//   se agregó `originContact` a ese tipo (ver ../provider.ts) porque
//   Correo Argentino lo pide como dato obligatorio real, no lo inventamos
//   nosotros.
// - Límites reales de peso/dimensiones de su contrato (el manual da un
//   ejemplo de OTRO cliente -- "para cliente 18018 el máximo es 25000"
//   gramos -- no es un valor genérico aplicable a GXK).
// - Código(s) de `serviceType` (2 letras) que correspondan a su cuenta --
//   `createShipment` lo exige (falla antes de armar el request si falta).
// - Formato de teléfono: el payload separa `areaCodePhone`/`phoneNumber`
//   (código de área + número) pero `ShippingRecipient.phone` es un solo
//   string -- no partimos el número en código de área + resto (inventar esa
//   regla de parseo sería un error mayor que mandarlo completo en un solo
//   campo); se manda tal cual en `phoneNumber`, `areaCodePhone` queda vacío.
//
// Lo que falta del dueño de GXK antes de poder probar esto de verdad:
// - Alta comercial con el área Comercial de Correo Argentino.
// - `agreement` (id de acuerdo) + API-Key, y sus equivalentes de QA.
// - Código(s) de `serviceType` de su cuenta.
// - Confirmar con Correo Argentino qué va en `productCategory`.
export const CORREO_ARGENTINO_CAPABILITIES: ShippingCapabilities = {
  quote: false,
  cancelShipment: true,
  branchPickup: true,
};

type CorreoArgentinoEnvironment = "qa" | "production";

// URLs públicas y fijas del manual oficial -- no son un secreto, por eso
// van hardcodeadas (mismo criterio que MP_API_BASE en
// src/lib/mercadopago/client.ts). Lo que sí es privado (API-Key, agreement)
// viene siempre de env vars, nunca de acá.
const CORREO_ARGENTINO_BASE_URL: Record<CorreoArgentinoEnvironment, string> = {
  qa: "https://apitest.correoargentino.com.ar/paqar",
  production: "https://api.correoargentino.com.ar/paqar",
};

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Faltan o son inválidas las variables de entorno de Correo Argentino
 * (CORREO_ARGENTINO_API_KEY / CORREO_ARGENTINO_AGREEMENT / CORREO_ARGENTINO_ENVIRONMENT).
 * Estado esperado hasta que el dueño de GXK sea cliente de Correo Argentino
 * y cargue sus credenciales -- nunca hay que simular una respuesta.
 */
export class CorreoArgentinoNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorreoArgentinoNotConfiguredError";
  }
}

type CorreoArgentinoConfig = { baseUrl: string; apiKey: string; agreement: string };

function getCorreoArgentinoConfig(): CorreoArgentinoConfig {
  const apiKey = process.env.CORREO_ARGENTINO_API_KEY;
  const agreement = process.env.CORREO_ARGENTINO_AGREEMENT;
  const environment = process.env.CORREO_ARGENTINO_ENVIRONMENT;

  const missing = [
    !apiKey && "CORREO_ARGENTINO_API_KEY",
    !agreement && "CORREO_ARGENTINO_AGREEMENT",
    !environment && "CORREO_ARGENTINO_ENVIRONMENT",
  ].filter((name): name is string => Boolean(name));
  if (missing.length > 0) {
    throw new CorreoArgentinoNotConfiguredError(`Faltan variables de entorno de Correo Argentino: ${missing.join(", ")}`);
  }
  if (environment !== "qa" && environment !== "production") {
    throw new CorreoArgentinoNotConfiguredError(
      `CORREO_ARGENTINO_ENVIRONMENT debe ser "qa" o "production" (se recibió "${environment}")`,
    );
  }

  return { baseUrl: CORREO_ARGENTINO_BASE_URL[environment], apiKey: apiKey!, agreement: agreement! };
}

export type CorreoArgentinoErrorKind =
  | "authentication"
  | "authorization"
  | "invalid_request"
  | "not_found"
  | "temporary"
  | "network"
  | "provider_error";

/**
 * Body de error documentado por el manual oficial para 400/401/403 (idéntico
 * en los tres): { timestamp, status, error, message, path }. "message" puede
 * venir vacío ("puede ser vacío en caso que el código de error sea lo
 * suficientemente descriptivo") -- por eso el fallback a "error".
 */
type CorreoArgentinoErrorBody = { timestamp?: string; status?: number; error?: string; message?: string; path?: string };

function classifyCorreoArgentinoStatus(status: number): CorreoArgentinoErrorKind {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 404) return "not_found";
  if (status === 429 || status === 502 || status === 503 || status === 504) return "temporary";
  if (status >= 500) return "provider_error";
  return "provider_error";
}

/** Error normalizado de la API de Correo Argentino -- nunca incluye la API-Key ni el header crudo. */
export class CorreoArgentinoApiError extends Error {
  constructor(
    public readonly kind: CorreoArgentinoErrorKind,
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "CorreoArgentinoApiError";
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Cliente HTTP interno único para toda request a Correo Argentino:
 * centraliza base URL, headers (Authorization/agreement), timeout y el
 * parseo de respuestas no-2xx -- ningún método de la clase hace `fetch`
 * directamente. `query` va siempre como query string (no como body): GET no
 * puede llevar body de forma confiable, y el manual nunca aclara lo
 * contrario para sus endpoints GET.
 */
async function correoArgentinoFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH"; query?: Record<string, string | boolean | undefined>; body?: unknown },
): Promise<T> {
  const config = getCorreoArgentinoConfig();

  const url = new URL(`${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Apikey ${config.apiKey}`,
        agreement: config.agreement,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CorreoArgentinoApiError("network", "Timeout al contactar la API de Correo Argentino");
    }
    throw new CorreoArgentinoApiError(
      "network",
      `Error de red al contactar la API de Correo Argentino: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  // GET /v1/auth responde 204 sin body en éxito -- ningún otro endpoint
  // documentado usa 204, pero cubrir el caso genéricamente es inocuo.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const parsedBody = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const kind = classifyCorreoArgentinoStatus(response.status);
    const errorBody = parsedBody as CorreoArgentinoErrorBody | undefined;
    const message = errorBody?.message || errorBody?.error || `Correo Argentino API error (HTTP ${response.status})`;
    throw new CorreoArgentinoApiError(kind, message, response.status, parsedBody);
  }

  return parsedBody as T;
}

// ----------------------------------------------------------------------------
// GET /v1/agencies
// ----------------------------------------------------------------------------

type CorreoArgentinoAgency = {
  location: {
    geolocation: { latitude: string; longitude: string };
    country_name: string | null;
    state_name: string | null;
    city_name: string | null;
    city_id: string | null;
    neighborhood_name: string | null;
    street_name: string | null;
    street_number: string | null;
    zip_code: string | null;
  };
  agency_id: string;
  agency_name: string;
  schedule: string | null;
  phone: string | null;
  package_reception: boolean | null;
  pickup_availability: boolean | null;
};

export function mapCorreoArgentinoAgency(agency: CorreoArgentinoAgency): ShippingPickupPoint {
  const latitude = Number(agency.location.geolocation?.latitude);
  const longitude = Number(agency.location.geolocation?.longitude);

  return {
    id: agency.agency_id,
    name: agency.agency_name,
    address: {
      streetName: agency.location.street_name ?? "",
      streetNumber: agency.location.street_number ?? "",
      locality: agency.location.city_name ?? "",
      // OJO: /v1/agencies devuelve el NOMBRE completo de la provincia
      // (state_name, ej. "SANTA FE"), NO el código de una letra de la tabla
      // de provincias que exige POST /v1/orders (state, ver más abajo) --
      // son dos formatos distintos dentro de la misma API, no algo que
      // hayamos inventado. No usar este valor tal cual como `state` de una
      // orden.
      province: agency.location.state_name ?? "",
      postalCode: agency.location.zip_code ?? "",
    },
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    // package_reception = habilitada para "imposición" (el comercio deja el
    // paquete); pickup_availability = habilitada para "entrega" (el
    // comprador retira) -- terminología exacta del manual, sección
    // "Consulta sucursales de Correo Argentino".
    acceptsDropoff: agency.package_reception === true,
    acceptsPickup: agency.pickup_availability === true,
    phone: agency.phone ?? undefined,
    schedule: agency.schedule ?? undefined,
  };
}

// ----------------------------------------------------------------------------
// POST /v1/orders
// ----------------------------------------------------------------------------

function mapAddressToCorreoArgentino(address: ShippingPostalAddress) {
  return {
    streetName: address.streetName,
    streetNumber: address.streetNumber,
    cityName: address.locality,
    floor: address.floor,
    department: address.apartment,
    state: address.province,
    zipCode: address.postalCode,
  };
}

/**
 * "YYYY-MM-DDTHH:mm:ss-03:00" (formato documentado para `saleDate`, offset
 * fijo -03:00 -- Argentina no tiene horario de verano). No usamos
 * `Date.toISOString()` porque esa siempre da offset Z/UTC, no -03:00.
 */
export function formatCorreoArgentinoSaleDate(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}-03:00`;
}

// ----------------------------------------------------------------------------
// POST /v1/labels
// ----------------------------------------------------------------------------

type CorreoArgentinoLabelResult = {
  trackingNumber: string;
  fileBase64: string;
  fileName: string;
  result: string;
};

// ----------------------------------------------------------------------------
// GET /v1/tracking
// ----------------------------------------------------------------------------

type CorreoArgentinoTrackingEvent = {
  // El manual usa "facilityId" en un ejemplo y "facilityCode" en otro para
  // el mismo dato (inconsistencia del propio manual, no nuestra) -- se
  // acepta cualquiera de los dos.
  facilityId?: string;
  facilityCode?: string;
  facility: string | null;
  statusId: string;
  status: string;
  // El manual muestra DOS formatos de fecha distintos entre sus propios
  // ejemplos (ISO "2017-06-27T10:00:00-03:00" vs "28-06-2022 11:53") -- no
  // normalizamos/parseamos, se conserva tal cual como string opaco (ver
  // ShippingTrackingEvent.occurredAt).
  date: string;
  sign?: string;
};

type CorreoArgentinoTrackingResult = {
  trackingNumber: string;
  quantity: number;
  event: CorreoArgentinoTrackingEvent[];
};

export function mapCorreoArgentinoTrackingEvent(event: CorreoArgentinoTrackingEvent): ShippingTrackingEvent {
  return {
    status: event.statusId,
    statusLabel: event.status,
    occurredAt: event.date,
    location: event.facility ?? undefined,
  };
}

export class CorreoArgentinoShippingProvider implements ShippingProvider {
  readonly id = "correo_argentino" as const;
  readonly capabilities = CORREO_ARGENTINO_CAPABILITIES;

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    // Config primero: si falta, ni construimos el payload ni salimos a la red.
    getCorreoArgentinoConfig();

    if (!input.serviceType) {
      throw new CorreoArgentinoApiError(
        "invalid_request",
        "serviceType es obligatorio para Correo Argentino (código de servicio de 2 letras, provisto por el área Comercial) y no fue provisto",
      );
    }

    const destination = input.destination;

    const senderData = {
      businessName: input.originContact.name,
      phoneNumber: input.originContact.phone,
      email: input.originContact.email,
      address: mapAddressToCorreoArgentino(input.origin),
    };

    const shippingData = {
      name: input.recipient.name,
      phoneNumber: input.recipient.phone,
      email: input.recipient.email,
      // "En caso de que sea un deliveryType diferente a 'homeDelivery' solo
      // es requerido que se completen los datos personales del
      // destinatario" (manual, sección shippingData) -- para destino
      // sucursal/locker no tenemos ni hace falta una dirección postal.
      address: destination.type === "address" ? mapAddressToCorreoArgentino(destination.address) : undefined,
    };

    // parcels[].productCategory: el manual lo exige en el payload (aparece
    // en todos los ejemplos, valor de muestra literal "categoria ejemplo")
    // pero nunca documenta qué valores son válidos ni para qué se usa --
    // es el único campo del payload sin su propia sección en "Validaciones
    // y definiciones". No inventamos un valor: createShipment llega hasta
    // acá (config validada, serviceType validado, senderData/shippingData
    // armados) y se detiene explícitamente en este campo.
    void senderData;
    void shippingData;
    void destination;
    throw new ShippingProviderNotImplementedError(
      this.id,
      "createShipment",
      "parcels[].productCategory es obligatorio en POST /v1/orders pero el manual oficial no documenta sus valores válidos ni tenemos un dato equivalente en nuestro catálogo/pedido -- falta que el área Comercial de Correo Argentino lo confirme",
    );
  }

  async getLabel(externalId: string): Promise<ShippingLabel> {
    const results = await correoArgentinoFetch<CorreoArgentinoLabelResult[]>("/v1/labels", {
      method: "POST",
      body: [{ sellerId: undefined, trackingNumber: externalId }],
    });

    const result = results[0];
    if (!result || result.result !== "OK") {
      throw new CorreoArgentinoApiError(
        "not_found",
        result?.result ?? `No se pudo obtener la etiqueta de ${externalId}`,
        undefined,
        result,
      );
    }

    return {
      fileBase64: result.fileBase64,
      fileName: result.fileName,
      contentType: "application/pdf",
    };
  }

  async getTracking(externalId: string): Promise<ShippingTrackingEvent[]> {
    const results = await correoArgentinoFetch<CorreoArgentinoTrackingResult[]>("/v1/tracking", {
      method: "GET",
      query: { trackingNumber: externalId },
    });

    // El manual es inconsistente consigo mismo sobre qué significa
    // "quantity: 0" (una sección dice que debería ser un 400, el ejemplo
    // inmediatamente siguiente lo muestra como un 200 normal con
    // event: []) -- no resolvemos esa contradicción adivinando: si el
    // servidor responde con status HTTP de error ya lo cubre
    // correoArgentinoFetch más arriba: si responde 200, simplemente
    // mapeamos los eventos que haya (puede ser un array vacío).
    const result = results[0];
    return (result?.event ?? []).map(mapCorreoArgentinoTrackingEvent);
  }

  async cancelShipment(externalId: string): Promise<void> {
    await correoArgentinoFetch(`/v1/orders/${encodeURIComponent(externalId)}/cancel`, { method: "PATCH" });
  }

  async listPickupPoints(filter?: { province?: string }): Promise<ShippingPickupPoint[]> {
    const agencies = await correoArgentinoFetch<CorreoArgentinoAgency[]>("/v1/agencies", {
      method: "GET",
      query: { stateId: filter?.province },
    });
    return agencies.map(mapCorreoArgentinoAgency);
  }
}
