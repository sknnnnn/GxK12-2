import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/familia/session";
import { getCamino } from "@/services/familia";
import { CAMINO_STATIONS } from "@/lib/familia/camino";
import { formatPrice } from "@/lib/format";
import { RichText } from "@/components/storefront/content/RichText";
import { CaminoPath } from "./CaminoPath";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Mi Camino — Familia GxK",
};

const STATUS_LABELS = { available: "Disponible", used: "Usado", void: "Anulado" } as const;

// Mi Camino 🐾 (Bible §25): 10 estaciones, 1 compra confirmada = 1
// estación. Solo cuentan pedidos pagados, confirmados, no cancelados y no
// devueltos. Estación 5 = 20% OFF; estación 10 = hasta 50% OFF, sujetos a
// condiciones, límites y margen. Luego se reinicia.
export default async function CaminoPage() {
  const { member } = await requireMember();
  const camino = await getCamino(createSupabaseAdminClient(), member.userId);
  const { position, settings } = camino;

  return (
    <>
      <h1>MI CAMINO 🐾</h1>
      <p>
        Estación {position.station} de {CAMINO_STATIONS}
        {position.cycle > 1 ? ` · vuelta ${position.cycle}` : ""}. 1 compra confirmada = 1 estación.
      </p>
      <p className={styles.muted}>
        {position.toNextReward === 1 ? "Falta 1 compra" : `Faltan ${position.toNextReward} compras`} para la estación{" "}
        {position.nextRewardStation}.
      </p>
      <CaminoPath station={position.station} />

      <section aria-label="Beneficios del Camino">
        <h2>Beneficios</h2>
        {!settings.rewardsEnabled && (
          <p className={styles.muted}>Los beneficios del Camino se habilitan pronto. Las estaciones que alcances quedan guardadas.</p>
        )}
        {settings.conditions && <RichText text={settings.conditions} />}
        {settings.maxDiscountAmount !== null && (
          <p className={styles.muted}>Tope por beneficio: {formatPrice(settings.maxDiscountAmount)}.</p>
        )}
        {camino.rewards.length === 0 ? (
          <p className={styles.muted}>Todavía no alcanzaste una estación con beneficio.</p>
        ) : (
          <ul className={styles.list}>
            {camino.rewards.map((reward) => (
              <li key={reward.id} className={styles.card}>
                <div className={styles.row}>
                  <span>
                    Vuelta {reward.cycle} · Estación {reward.station}
                    {reward.percent !== null ? ` — ${reward.percent}% OFF` : ""}
                  </span>
                  <span>{STATUS_LABELS[reward.status]}</span>
                </div>
                {reward.usable && <span className={styles.muted}>Lo podés usar en tu próxima compra con esta cuenta.</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
