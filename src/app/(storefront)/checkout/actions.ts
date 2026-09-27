"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitCheckout } from "@/services/checkout";
import type { CheckoutCustomerInput, CheckoutResult, CheckoutShippingInput } from "@/services/checkout";
import type { CartItemInput } from "@/services/cart";

export type SubmitCheckoutInput = {
  items: CartItemInput[];
  customer: CheckoutCustomerInput;
  shipping: CheckoutShippingInput;
};

function isCartItemInputArray(value: unknown): value is CartItemInput[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const record = item as Record<string, unknown>;
      return typeof record.variantId === "string" && typeof record.quantity === "number";
    })
  );
}

function isStringRecord(value: unknown, keys: string[]): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === "string");
}

/**
 * Server Action que dispara el checkout desde el Storefront (guest
 * checkout, ver src/app/(storefront)/checkout/page.tsx). Es un endpoint POST
 * alcanzable directamente sin pasar por la UI (ver docs Server Actions):
 * el payload llega tipado como `unknown` a propósito y se valida en forma
 * acá antes de delegar cualquier dato a services/checkout, que es quien
 * revalida contra Supabase todo lo sensible (precio, stock, variante).
 */
export async function submitCheckoutAction(input: unknown): Promise<CheckoutResult> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, issues: [{ type: "malformed_request" }] };
  }

  const { items, customer, shipping } = input as Record<string, unknown>;

  if (
    !isCartItemInputArray(items) ||
    !isStringRecord(customer, ["firstName", "lastName", "email", "phone"]) ||
    !isStringRecord(shipping, ["address", "locality", "province", "postalCode"])
  ) {
    return { ok: false, issues: [{ type: "malformed_request" }] };
  }

  const supabase = createSupabaseAdminClient();
  return submitCheckout(supabase, {
    items,
    customer: customer as CheckoutCustomerInput,
    shipping: shipping as CheckoutShippingInput,
  });
}
