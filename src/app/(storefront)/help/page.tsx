import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteContent, getSiteSettings } from "@/services/site";
import { availableDeliveryMethods, getDeliveryMethods } from "@/services/shipping/delivery";
import { getPaymentSettings } from "@/services/payments/settings";
import { EXCHANGE_POLICY, SIZE_GUIDE } from "@/lib/storefront/content";
import { buildWhatsAppHref, GENERAL_INQUIRY_MESSAGE } from "@/lib/storefront/whatsapp";
import { formatPrice } from "@/lib/format";
import { RichText } from "@/components/storefront/content/RichText";
import styles from "@/components/storefront/content/content.module.css";

export const metadata: Metadata = { title: "Help — GXK" };

// Help (Bible §31): un único lugar para cómo comprar, talles, envíos,
// cambios, pagos, FAQ y contacto. Lo definido por la Bible y la
// configuración real se muestra solo; el resto lo escribe GXK en Admin.
export default async function HelpPage() {
  const supabase = await createSupabaseServerClient();
  const [content, site, methods, payment] = await Promise.all([
    getSiteContent(supabase),
    getSiteSettings(supabase),
    getDeliveryMethods(supabase),
    getPaymentSettings(supabase),
  ]);
  const delivery = availableDeliveryMethods(methods);
  const payments = [
    payment.mercadoPagoEnabled ? "Mercado Pago (tarjetas y cuotas según Mercado Pago)" : null,
    payment.meetingPointDepositEnabled && payment.mercadoPagoEnabled ? "Punto de encuentro: 50% de reserva + 50% en la entrega" : null,
    payment.cashEnabled ? "Efectivo en la entrega (punto de encuentro)" : null,
  ].filter(Boolean);

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <h1>HELP</h1>

      {content.helpBody && (
        <section className={styles.section}>
          <h2>Cómo comprar y preguntas frecuentes</h2>
          <RichText text={content.helpBody} />
        </section>
      )}

      <section className={styles.section} id="talles">
        <h2>Talles</h2>
        <p>{SIZE_GUIDE.intro}</p>
        <p>{SIZE_GUIDE.howToCompare}</p>
        <p>Cada producto muestra sus medidas reales.</p>
      </section>

      <section className={styles.section} id="envios">
        <h2>Envíos</h2>
        {delivery.length === 0 ? (
          <p className={styles.muted}>Las modalidades de entrega todavía no están habilitadas.</p>
        ) : (
          <ul>
            {delivery.map((method) => (
              <li key={method.id}>
                {method.label}: {method.cost === 0 ? "sin costo" : formatPrice(method.cost)}
                {method.details ? ` — ${method.details}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p>Envío: pago completo. Punto de encuentro: posibilidad de 50% reserva + 50% entrega.</p>
        <p>
          Seguí tu pedido desde <Link href="/seguimiento">Seguimiento</Link>.
        </p>
      </section>

      <section className={styles.section} id="cambios">
        <h2>Cambios</h2>
        <ul>
          {EXCHANGE_POLICY.conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
        <ul>
          {EXCHANGE_POLICY.shippingCosts.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} id="pagos">
        <h2>Pagos</h2>
        {payments.length === 0 ? <p className={styles.muted}>Los medios de pago todavía no están habilitados.</p> : <ul>{payments.map((p) => <li key={p}>{p}</li>)}</ul>}
      </section>

      {site.whatsappNumber && (
        <section className={styles.section} id="contacto">
          <h2>Contacto</h2>
          <p>
            <a href={buildWhatsAppHref(site.whatsappNumber, GENERAL_INQUIRY_MESSAGE)} target="_blank" rel="noopener noreferrer">
              Escribinos por WhatsApp
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
