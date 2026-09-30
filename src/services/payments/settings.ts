// Medios de pago (Bible §18: Mercado Pago, efectivo, tarjetas, cuotas cuando
// corresponda según Mercado Pago) y seña del punto de encuentro (Bible §19:
// posibilidad de 50% reserva + 50% entrega). Configurable desde Admin.
//
// Pendiente de definición (Roadmap): alcance exacto de "efectivo" y
// configuración final de cuotas. Por eso el efectivo arranca deshabilitado y
// solo se ofrece con punto de encuentro (un envío por correo se paga completo
// por adelantado, Bible §19), y las cuotas quedan en lo que ofrezca Mercado
// Pago salvo que el admin fije un máximo.

import type { GxkSupabaseClient } from "@/lib/supabase/types";
import type { DeliveryMethodId } from "@/services/shipping/delivery";

export type PaymentSettings = {
  mercadoPagoEnabled: boolean;
  maxInstallments: number | null;
  cashEnabled: boolean;
  meetingPointDepositEnabled: boolean;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  mercadoPagoEnabled: true,
  maxInstallments: null,
  cashEnabled: false,
  meetingPointDepositEnabled: true,
};

export async function getPaymentSettings(supabase: GxkSupabaseClient): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("mercado_pago_enabled, max_installments, cash_enabled, meeting_point_deposit_enabled")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_PAYMENT_SETTINGS;
  return {
    mercadoPagoEnabled: data.mercado_pago_enabled,
    maxInstallments: data.max_installments,
    cashEnabled: data.cash_enabled,
    meetingPointDepositEnabled: data.meeting_point_deposit_enabled,
  };
}

export async function updatePaymentSettings(
  supabase: GxkSupabaseClient,
  settings: PaymentSettings,
): Promise<{ ok: true } | { ok: false; reason: "not_allowed" }> {
  const { data, error } = await supabase
    .from("payment_settings")
    .update({
      mercado_pago_enabled: settings.mercadoPagoEnabled,
      max_installments: settings.maxInstallments,
      cash_enabled: settings.cashEnabled,
      meeting_point_deposit_enabled: settings.meetingPointDepositEnabled,
    })
    .eq("id", true)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) return { ok: false, reason: "not_allowed" };
  return { ok: true };
}

export const PAYMENT_OPTION_IDS = ["mp_full", "mp_deposit", "cash"] as const;
export type PaymentOptionId = (typeof PAYMENT_OPTION_IDS)[number];

export type PaymentOption = {
  id: PaymentOptionId;
  label: string;
  /** Parte del total que se paga ahora online (0..1). */
  onlineShare: 0 | 0.5 | 1;
  paymentMethod: "mercado_pago" | "cash";
  paymentPlan: "full" | "deposit";
};

const OPTIONS: Record<PaymentOptionId, PaymentOption> = {
  mp_full: { id: "mp_full", label: "Mercado Pago (pago completo)", onlineShare: 1, paymentMethod: "mercado_pago", paymentPlan: "full" },
  mp_deposit: {
    id: "mp_deposit",
    label: "50% de reserva por Mercado Pago + 50% en la entrega",
    onlineShare: 0.5,
    paymentMethod: "mercado_pago",
    paymentPlan: "deposit",
  },
  cash: { id: "cash", label: "Efectivo en la entrega", onlineShare: 0, paymentMethod: "cash", paymentPlan: "full" },
};

/** Medios de pago posibles para una modalidad de entrega, según la configuración. */
export function paymentOptionsFor(settings: PaymentSettings, delivery: DeliveryMethodId): PaymentOption[] {
  const options: PaymentOption[] = [];
  if (settings.mercadoPagoEnabled) options.push(OPTIONS.mp_full);
  if (delivery === "meeting_point") {
    if (settings.mercadoPagoEnabled && settings.meetingPointDepositEnabled) options.push(OPTIONS.mp_deposit);
    if (settings.cashEnabled) options.push(OPTIONS.cash);
  }
  return options;
}

export function isPaymentOptionId(value: unknown): value is PaymentOptionId {
  return typeof value === "string" && (PAYMENT_OPTION_IDS as readonly string[]).includes(value);
}

/** Mismo redondeo que create_order: 50% a 2 decimales. */
export function amountDueOnline(total: number, option: PaymentOption): number {
  if (option.onlineShare === 0) return 0;
  if (option.onlineShare === 0.5) return Math.round(total * 50) / 100;
  return total;
}
