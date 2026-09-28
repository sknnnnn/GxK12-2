"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseShippingSettingsInput, updateShippingSettings, type ShippingSettingsFormInput } from "@/services/shipping";

const FORM_FIELDS: Array<keyof ShippingSettingsFormInput> = [
  "activeProvider",
  "shippingCost",
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

// Mismo patrón que Pedidos: form plano, feedback vía ?error=/?success=.
// Toda la validación vive en services/shipping (parseShippingSettingsInput);
// la autorización real es RLS (admin_update_shipping_settings) a través del
// cliente de sesión -- un no-admin termina en "not_allowed" sin tocar nada.
export async function updateShippingSettingsAction(formData: FormData): Promise<void> {
  const input: ShippingSettingsFormInput = {};
  for (const field of FORM_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") input[field] = value;
  }

  const parsed = parseShippingSettingsInput(input);
  if (!parsed.ok) {
    redirect(`/admin/configuracion?error=${encodeURIComponent(parsed.errors.join(" "))}`);
  }

  const supabase = await createSupabaseServerClient();
  const result = await updateShippingSettings(supabase, parsed.value);
  if (!result.ok) {
    redirect(`/admin/configuracion?error=${encodeURIComponent("No tenés permisos para modificar la configuración.")}`);
  }

  redirect("/admin/configuracion?success=1");
}
