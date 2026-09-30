"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitCheckout, type CheckoutAddressInput, type CheckoutCustomerInput, type CheckoutResult } from "@/services/checkout";
import type { CartItemInput } from "@/services/cart";

function isCartItemInputArray(value: unknown): value is CartItemInput[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
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
  return keys.every((key) => typeof record[key] === "string" && (record[key] as string).length <= 200);
}

const CUSTOMER_KEYS = ["firstName", "lastName", "email", "phone"];
const ADDRESS_KEYS = ["streetName", "streetNumber", "floor", "apartment", "locality", "province", "postalCode"];

/**
 * Server Action del checkout (compra sin cuenta). Es un POST alcanzable sin
 * la UI: el payload llega como `unknown` y se valida la forma acá; todo lo
 * sensible (precio, stock, modalidad, costo, medio de pago) lo decide
 * services/checkout contra Supabase.
 */
export async function submitCheckoutAction(input: unknown): Promise<CheckoutResult> {
  if (typeof input !== "object" || input === null) return { ok: false, issues: [{ type: "malformed_request" }] };
  const { items, customer, deliveryMethod, address, paymentOption } = input as Record<string, unknown>;

  if (
    !isCartItemInputArray(items) ||
    !isStringRecord(customer, CUSTOMER_KEYS) ||
    typeof deliveryMethod !== "string" ||
    typeof paymentOption !== "string" ||
    (address !== null && !isStringRecord(address, ADDRESS_KEYS))
  ) {
    return { ok: false, issues: [{ type: "malformed_request" }] };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  return submitCheckout(createSupabaseAdminClient(), {
    items,
    customer: customer as CheckoutCustomerInput,
    deliveryMethod,
    address: address as CheckoutAddressInput | null,
    paymentOption,
    siteUrl,
  });
}
