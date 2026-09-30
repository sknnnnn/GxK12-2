// Configuración de envíos (PRO-128): proveedor activo, costo fijo cobrado
// en checkout, service type y datos de despacho de GXK -- todo editable por
// un admin desde Admin Web (tabla shipping_settings, fila única), nunca
// hardcodeado ni recibido del navegador.
//
// Convención de GXK Core: cada función recibe un GxkSupabaseClient. Lectura:
// checkout y la creación de envío post-pago usan el cliente admin
// (service-role, solo SELECT); Admin Web usa el cliente de sesión (RLS
// admin_read/admin_update_shipping_settings).
//
// Deliberadamente NO hay valores por defecto: proveedor inicial, costo y
// origen son decisiones de GXK todavía abiertas. Mientras falten,
// resolveCheckoutShipping devuelve "no configurado" y el checkout se
// rechaza en vez de cobrar un envío inventado.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { ShippingPostalAddress, ShippingProviderId, ShippingRecipient } from "./provider";

export const SHIPPING_PROVIDER_IDS: readonly ShippingProviderId[] = ["andreani", "correo_argentino"];

export function isShippingProviderId(value: unknown): value is ShippingProviderId {
  return typeof value === "string" && (SHIPPING_PROVIDER_IDS as readonly string[]).includes(value);
}

// Datos de despacho de GXK para dar de alta envíos en Andreani / Correo
// Argentino. Qué modalidades de entrega se ofrecen y a qué costo vive en
// delivery_methods (./delivery.ts).
export type ShippingSettings = {
  serviceType: string | null;
  originAddress: ShippingPostalAddress | null;
  originContact: ShippingRecipient | null;
};

export const EMPTY_SHIPPING_SETTINGS: ShippingSettings = {
  serviceType: null,
  originAddress: null,
  originContact: null,
};

const ADDRESS_REQUIRED_KEYS = ["streetName", "streetNumber", "locality", "province", "postalCode"] as const;
const ADDRESS_OPTIONAL_KEYS = ["floor", "apartment"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Valida un domicilio postal guardado como jsonb (shipping_settings.origin_address
 * u orders.shipping_address). Devuelve null si falta cualquier campo
 * obligatorio -- nunca completa un dato faltante.
 */
export function parsePostalAddress(value: unknown): ShippingPostalAddress | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ADDRESS_REQUIRED_KEYS) {
    if (typeof record[key] !== "string" || !(record[key] as string).trim()) return null;
  }
  const address: ShippingPostalAddress = {
    streetName: (record.streetName as string).trim(),
    streetNumber: (record.streetNumber as string).trim(),
    locality: (record.locality as string).trim(),
    province: (record.province as string).trim(),
    postalCode: (record.postalCode as string).trim(),
  };
  for (const key of ADDRESS_OPTIONAL_KEYS) {
    if (typeof record[key] === "string" && (record[key] as string).trim()) address[key] = (record[key] as string).trim();
  }
  return address;
}

function parseContact(value: unknown): ShippingRecipient | null {
  const record = asRecord(value);
  if (!record || typeof record.name !== "string" || !record.name.trim()) return null;
  const contact: ShippingRecipient = { name: record.name.trim() };
  if (typeof record.email === "string" && record.email.trim()) contact.email = record.email.trim();
  if (typeof record.phone === "string" && record.phone.trim()) contact.phone = record.phone.trim();
  return contact;
}

export async function getShippingSettings(supabase: GxkSupabaseClient): Promise<ShippingSettings> {
  const { data, error } = await supabase
    .from("shipping_settings")
    .select("service_type, origin_address, origin_contact")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return EMPTY_SHIPPING_SETTINGS;

  return {
    serviceType: data.service_type?.trim() || null,
    originAddress: parsePostalAddress(data.origin_address),
    originContact: parseContact(data.origin_contact),
  };
}


// ----------------------------------------------------------------------------
// Edición desde Admin Web
// ----------------------------------------------------------------------------

export type ShippingSettingsFormInput = Partial<
  Record<
    | "serviceType"
    | "originStreetName"
    | "originStreetNumber"
    | "originFloor"
    | "originApartment"
    | "originLocality"
    | "originProvince"
    | "originPostalCode"
    | "originContactName"
    | "originContactEmail"
    | "originContactPhone",
    string
  >
>;

export type ParseShippingSettingsResult = { ok: true; value: ShippingSettings } | { ok: false; errors: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 200;

/**
 * Valida el formulario de datos de despacho. Todo es opcional, pero el
 * domicilio de origen es "todo o nada" -- un domicilio a medias no le sirve
 * a ningún proveedor.
 */
export function parseShippingSettingsInput(input: ShippingSettingsFormInput): ParseShippingSettingsResult {
  const errors: string[] = [];
  const text = (value: string | undefined) => (value ?? "").trim();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) errors.push(`El campo ${key} es demasiado largo.`);
  }

  const serviceType = text(input.serviceType) || null;

  const addressFields = {
    streetName: text(input.originStreetName),
    streetNumber: text(input.originStreetNumber),
    floor: text(input.originFloor),
    apartment: text(input.originApartment),
    locality: text(input.originLocality),
    province: text(input.originProvince),
    postalCode: text(input.originPostalCode),
  };
  const anyAddress = Object.values(addressFields).some(Boolean);
  let originAddress: ShippingPostalAddress | null = null;
  if (anyAddress) {
    originAddress = parsePostalAddress(addressFields);
    if (!originAddress) {
      errors.push("El domicilio de despacho está incompleto: calle, número, localidad, provincia y código postal son obligatorios.");
    }
  }

  const contactFields = {
    name: text(input.originContactName),
    email: text(input.originContactEmail),
    phone: text(input.originContactPhone),
  };
  let originContact: ShippingRecipient | null = null;
  if (Object.values(contactFields).some(Boolean)) {
    originContact = parseContact(contactFields);
    if (!originContact) errors.push("El contacto del remitente necesita al menos un nombre / razón social.");
    if (contactFields.email && !EMAIL_PATTERN.test(contactFields.email)) errors.push("El email del remitente no es válido.");
  }

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, value: { serviceType, originAddress, originContact } };
}

export type UpdateShippingSettingsResult = { ok: true } | { ok: false; reason: "not_allowed" };

/**
 * Persiste una configuración YA validada por parseShippingSettingsInput.
 * Con el cliente de sesión, RLS (admin_update_shipping_settings) es la
 * barrera real: si quien llama no es un admin activo, el UPDATE no afecta
 * ninguna fila y se devuelve "not_allowed".
 */
export async function updateShippingSettings(
  supabase: GxkSupabaseClient,
  settings: ShippingSettings,
): Promise<UpdateShippingSettingsResult> {
  const { data, error } = await supabase
    .from("shipping_settings")
    .update({
      service_type: settings.serviceType,
      origin_address: settings.originAddress,
      origin_contact: settings.originContact,
    })
    .eq("id", true)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  return { ok: true };
}
