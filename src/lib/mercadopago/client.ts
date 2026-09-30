import "server-only";
import type { Json } from "@/types/database";

// Cliente mínimo (fetch puro, sin SDK) para la API REST de Mercado Pago.
// Server-only: usa MERCADO_PAGO_ACCESS_TOKEN, que nunca debe llegar al
// navegador. Solo cubre las dos operaciones que necesita el flujo de
// Checkout Pro: crear una Preference y consultar un Payment real -- no es
// un wrapper genérico de toda la API.
//
// Se eligió fetch directo en vez del SDK oficial `mercadopago` (npm) para no
// agregar una dependencia nueva: la superficie que usamos (2 endpoints) es
// simple y ya usamos node:crypto para HMAC en otro lado del proyecto.

const MP_API_BASE = "https://api.mercadopago.com";

/**
 * MERCADO_PAGO_ACCESS_TOKEN no está configurado (`.env.local` vacío). No es
 * un error de programación -- es el estado esperado hasta que el dueño de
 * GXK cargue sus credenciales TEST/producción. Quien llame a `createPreference`
 * debe manejar este caso explícitamente (ver services/payments), nunca
 * simular una preference falsa.
 */
export class MercadoPagoNotConfiguredError extends Error {
  constructor() {
    super("MERCADO_PAGO_ACCESS_TOKEN no está configurado");
    this.name = "MercadoPagoNotConfiguredError";
  }
}

export class MercadoPagoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`Mercado Pago API error (HTTP ${status})`);
    this.name = "MercadoPagoApiError";
  }
}

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoNotConfiguredError();
  return token;
}

async function mpFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new MercadoPagoApiError(response.status, body);
  return body as T;
}

export type MercadoPagoPreferenceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
};

export type CreatePreferenceInput = {
  items: MercadoPagoPreferenceItem[];
  externalReference: string;
  backUrls: { success: string; pending: string; failure: string };
  notificationUrl: string;
  /** Máximo de cuotas configurado por GXK; sin valor, las que ofrezca Mercado Pago. */
  maxInstallments?: number | null;
};

export type MercadoPagoPreference = {
  id: string;
  initPoint: string;
};

/**
 * Crea una Preference de Checkout Pro. Devuelve `sandbox_init_point` cuando
 * el access token es de TEST (prefijo `TEST-`, convención documentada por
 * Mercado Pago) y `init_point` para credenciales de producción -- redirigir
 * a la URL equivocada según el tipo de credencial es un error común.
 */
export async function createPreference(input: CreatePreferenceInput): Promise<MercadoPagoPreference> {
  const token = getAccessToken();
  const isTestCredential = token.startsWith("TEST-");

  const body: Record<string, unknown> = {
    items: input.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: "ARS",
    })),
    external_reference: input.externalReference,
    back_urls: {
      success: input.backUrls.success,
      pending: input.backUrls.pending,
      failure: input.backUrls.failure,
    },
    notification_url: input.notificationUrl,
  };

  if (input.maxInstallments) {
    body.payment_methods = { installments: input.maxInstallments };
  }

  // auto_return exige que back_urls.success sea https -- en desarrollo
  // (localhost) la API de Mercado Pago rechaza la preference si se manda,
  // así que se omite fuera de ese caso en vez de fallar la creación entera.
  if (input.backUrls.success.startsWith("https://")) {
    body.auto_return = "approved";
  }

  const preference = await mpFetch<{
    id: string;
    init_point: string;
    sandbox_init_point: string;
  }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    id: preference.id,
    initPoint: isTestCredential ? preference.sandbox_init_point : preference.init_point,
  };
}

export type MercadoPagoPayment = {
  id: string;
  status: string;
  externalReference: string | null;
  amount: number;
  currency: string;
  raw: Json;
};

/**
 * Consulta un pago real por id (GET /v1/payments/{id}). Esta es la ÚNICA
 * fuente de verdad sobre el estado de un pago -- nunca el payload del
 * webhook en sí, que solo avisa "hay novedades" (ver services/payments).
 */
export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const payment = await mpFetch<{
    id: number;
    status: string;
    external_reference: string | null;
    transaction_amount: number;
    currency_id: string;
  }>(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });

  return {
    id: String(payment.id),
    status: payment.status,
    externalReference: payment.external_reference,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    raw: payment as unknown as Json,
  };
}
