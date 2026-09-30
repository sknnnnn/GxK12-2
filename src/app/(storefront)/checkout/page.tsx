import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCheckoutOptions } from "@/services/checkout";
import { getCamino, getCurrentMember, getMemberAddresses } from "@/services/familia";
import { CheckoutFlow, type CheckoutMember } from "./CheckoutFlow";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Checkout — GXK",
};

// Checkout (Bible §32): 1 Datos · 2 Entrega · 3 Pago · 4 Confirmación. Las
// modalidades de entrega y medios de pago salen de la configuración real.
export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const [options, member] = await Promise.all([getCheckoutOptions(supabase), getCurrentMember(supabase)]);

  // Familia GxK (opcional): datos precargados, direcciones y beneficios del Camino.
  let checkoutMember: CheckoutMember | null = null;
  if (member) {
    const [addresses, camino] = await Promise.all([getMemberAddresses(supabase), getCamino(createSupabaseAdminClient(), member.userId)]);
    checkoutMember = {
      customer: { firstName: member.firstName, lastName: member.lastName, email: member.email, phone: member.phone },
      addresses,
      rewards: camino.rewards
        .filter((reward) => reward.usable && reward.percent !== null)
        .map((reward) => ({ id: reward.id, station: reward.station, percent: reward.percent as number })),
      maxDiscountAmount: camino.settings.maxDiscountAmount,
    };
  }
  return (
    <main className={styles.main}>
      <h1>CHECKOUT</h1>
      <CheckoutFlow
        delivery={options.delivery}
        paymentOptionsByDelivery={options.paymentOptionsByDelivery}
        member={checkoutMember}
      />
    </main>
  );
}
