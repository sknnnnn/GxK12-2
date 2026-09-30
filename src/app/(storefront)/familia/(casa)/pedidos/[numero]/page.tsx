import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/familia/session";
import { lookupOrderForTracking } from "@/services/orders";
import { OrderStatusPanel } from "@/components/storefront/orders/OrderStatusPanel";

export const metadata: Metadata = {
  title: "Pedido — Familia GxK",
};

// Seguimiento del pedido desde MI CASA: mismo criterio que el tracking
// público (número + email), con el email de la cuenta.
export default async function MiPedidoPage({ params }: PageProps<"/familia/pedidos/[numero]">) {
  const { numero } = await params;
  const { member } = await requireMember();
  const order = await lookupOrderForTracking(createSupabaseAdminClient(), numero, member.email);
  if (!order) notFound();
  return (
    <>
      <p>
        <Link href="/familia/pedidos">← Mis pedidos</Link>
      </p>
      <OrderStatusPanel order={order} />
    </>
  );
}
