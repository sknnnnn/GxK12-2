import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCheckoutOptions } from "@/services/checkout";
import { CheckoutFlow } from "./CheckoutFlow";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Checkout — GXK",
};

// Checkout (Bible §32): 1 Datos · 2 Entrega · 3 Pago · 4 Confirmación. Las
// modalidades de entrega y medios de pago salen de la configuración real.
export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const options = await getCheckoutOptions(supabase);
  return (
    <main className={styles.main}>
      <h1>CHECKOUT</h1>
      <CheckoutFlow delivery={options.delivery} paymentOptionsByDelivery={options.paymentOptionsByDelivery} />
    </main>
  );
}
