"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isDeliveryMethodId,
  parseDeliveryMethodInput,
  parseShippingSettingsInput,
  updateDeliveryMethod,
  updateShippingSettings,
  type ShippingSettingsFormInput,
} from "@/services/shipping";
import { updatePaymentSettings } from "@/services/payments";
import { parseSiteSettingsInput, updateSiteSettings } from "@/services/site";

// Mismo patrón que el resto de Admin: form plano, feedback vía
// ?error=/?success=. La validación vive en services/*; la autorización real
// es RLS a través del cliente de sesión (un no-admin termina en
// "not_allowed" sin tocar nada).

const NOT_ALLOWED = "No tenés permisos para modificar la configuración.";

function back(query: string): never {
  redirect(`/admin/configuracion?${query}`);
}

const SHIPPING_FIELDS: Array<keyof ShippingSettingsFormInput> = [
  "serviceType",
  "originStreetName",
  "originStreetNumber",
  "originFloor",
  "originApartment",
  "originLocality",
  "originProvince",
  "originPostalCode",
  "originContactName",
  "originContactEmail",
  "originContactPhone",
];

export async function updateShippingSettingsAction(formData: FormData): Promise<void> {
  const input: ShippingSettingsFormInput = {};
  for (const field of SHIPPING_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") input[field] = value;
  }
  const parsed = parseShippingSettingsInput(input);
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.errors.join(" "))}`);
  const result = await updateShippingSettings(await createSupabaseServerClient(), parsed.value);
  if (!result.ok) back(`error=${encodeURIComponent(NOT_ALLOWED)}`);
  back("success=despacho");
}

export async function updateDeliveryMethodAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (!isDeliveryMethodId(id)) back(`error=${encodeURIComponent("Modalidad inválida.")}`);
  const parsed = parseDeliveryMethodInput({
    isEnabled: formData.get("isEnabled") === "on",
    cost: String(formData.get("cost") ?? ""),
    details: String(formData.get("details") ?? ""),
  });
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.error)}`);
  const result = await updateDeliveryMethod(await createSupabaseServerClient(), id, parsed.value);
  if (!result.ok) back(`error=${encodeURIComponent(NOT_ALLOWED)}`);
  back("success=entrega");
}

export async function updatePaymentSettingsAction(formData: FormData): Promise<void> {
  const installmentsText = String(formData.get("maxInstallments") ?? "").trim();
  const maxInstallments = installmentsText ? Number(installmentsText) : null;
  if (maxInstallments !== null && (!Number.isInteger(maxInstallments) || maxInstallments < 1 || maxInstallments > 24)) {
    back(`error=${encodeURIComponent("Las cuotas máximas deben ser un número entre 1 y 24, o quedar vacías.")}`);
  }
  const result = await updatePaymentSettings(await createSupabaseServerClient(), {
    mercadoPagoEnabled: formData.get("mercadoPagoEnabled") === "on",
    maxInstallments,
    cashEnabled: formData.get("cashEnabled") === "on",
    meetingPointDepositEnabled: formData.get("meetingPointDepositEnabled") === "on",
  });
  if (!result.ok) back(`error=${encodeURIComponent(NOT_ALLOWED)}`);
  back("success=pagos");
}

export async function updateSiteSettingsAction(formData: FormData): Promise<void> {
  const parsed = parseSiteSettingsInput({
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    tiktokUrl: String(formData.get("tiktokUrl") ?? ""),
  });
  if (!parsed.ok) back(`error=${encodeURIComponent(parsed.errors.join(" "))}`);
  const result = await updateSiteSettings(await createSupabaseServerClient(), parsed.value);
  if (!result.ok) back(`error=${encodeURIComponent(NOT_ALLOWED)}`);
  back("success=sitio");
}
