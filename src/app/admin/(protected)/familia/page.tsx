import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getFamiliaOverview, getMemberDetail, searchMembers } from "@/services/admin";
import { getCaminoSettings } from "@/services/familia";
import { caminoPosition, STATION_5_PERCENT, STATION_10_MAX_PERCENT } from "@/lib/familia/camino";
import { orderStatusLabel } from "@/lib/orders/status";
import { formatPrice } from "@/lib/format";
import { formatDateAR } from "@/lib/datetime";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import styles from "@/components/admin/admin.module.css";
import { broadcastAction, saveCaminoSettingsAction } from "./actions";

// Familia GxK (Roadmap Bloque 6): Camino G & K, comunicaciones a miembros
// (beneficios, invitaciones, prelaunches) y resumen de la Familia.
export default async function AdminFamiliaPage(props: PageProps<"/admin/familia">) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();
  const [settings, overview] = await Promise.all([getCaminoSettings(supabase), getFamiliaOverview(supabase)]);
  const sent = typeof searchParams.enviadas === "string" ? searchParams.enviadas : null;
  // Búsqueda de miembros (solo lectura): pedidos, progreso del Camino y beneficios.
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const matches = query ? await searchMembers(supabase, query) : [];
  const selected = matches.find((member) => member.userId === searchParams.miembro) ?? (matches.length === 1 ? matches[0] : null);
  const detail = selected ? await getMemberDetail(supabase, selected) : null;
  const position = selected ? caminoPosition(selected.confirmedPurchases) : null;

  return (
    <div className={styles.page}>
      <h1>Familia GxK</h1>
      <Flash searchParams={searchParams} />
      {sent !== null && <p className={styles.success}>Comunicación enviada a {sent} miembros.</p>}

      <section className={styles.card}>
        <h2>Resumen</h2>
        <p>
          {overview.members} miembros · beneficios del Camino: {overview.rewards.available} disponibles, {overview.rewards.used} usados.
        </p>
        {overview.recent.length > 0 && (
          <ul className={styles.list}>
            {overview.recent.map((member, index) => (
              <li key={`${member.name}-${index}`}>
                {member.name || "(sin nombre)"} — {formatDateAR(member.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card} id="miembros">
        <h2>Buscar miembro</h2>
        <form method="get" action="/admin/familia#miembros" className={styles.row}>
          <input name="q" defaultValue={query} placeholder="Email o nombre" aria-label="Email o nombre" minLength={2} required />
          <button type="submit" className={styles.buttonSecondary}>
            Buscar
          </button>
        </form>
        {query && matches.length === 0 && <p className={styles.muted}>No hay miembros que coincidan.</p>}
        {matches.length > 1 && (
          <ul className={styles.list}>
            {matches.map((member) => (
              <li key={member.userId}>
                <Link href={`/admin/familia?q=${encodeURIComponent(query)}&miembro=${member.userId}#miembros`}>
                  {member.email}
                </Link>{" "}
                — {member.name || "(sin nombre)"}
              </li>
            ))}
          </ul>
        )}
        {selected && detail && position && (
          <div className={styles.form}>
            <h3>{selected.name || selected.email}</h3>
            <p>
              {selected.email}
              {selected.phone ? ` · ${selected.phone}` : ""} · miembro desde {formatDateAR(selected.createdAt)}
              {selected.emailConfirmed ? "" : " · email sin confirmar"}
            </p>
            <p>
              Camino: vuelta {position.cycle}, estación {position.station} de 10 ({selected.confirmedPurchases} compras que cuentan, incluidas
              las hechas como invitado con este email).
            </p>
            <h4>Beneficios</h4>
            {detail.rewards.length === 0 ? (
              <p className={styles.muted}>Sin beneficios emitidos.</p>
            ) : (
              <ul className={styles.list}>
                {detail.rewards.map((reward) => (
                  <li key={reward.id}>
                    Vuelta {reward.cycle} · estación {reward.station} · {reward.status === "available" ? "disponible" : reward.status === "used" ? "usado" : "anulado"}
                    {reward.percent !== null ? ` · ${reward.percent}%` : ""}
                    {reward.discountAmount !== null ? ` · ${formatPrice(reward.discountAmount)}` : ""}
                    {reward.orderId ? (
                      <>
                        {" "}
                        · <Link href={`/admin/pedidos/${reward.orderId}`}>pedido</Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <h4>Pedidos</h4>
            {detail.orders.length === 0 ? (
              <p className={styles.muted}>Sin pedidos con este email.</p>
            ) : (
              <ul className={styles.list}>
                {detail.orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/pedidos/${order.id}`}>#{order.orderNumber}</Link> — {formatDateAR(order.createdAt)} ·{" "}
                    {orderStatusLabel(order.status)} · {formatPrice(order.total)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <form action={saveCaminoSettingsAction} id="camino" className={`${styles.card} ${styles.form}`}>
        <h2>Camino G &amp; K</h2>
        <p className={styles.muted}>
          10 estaciones · 1 compra confirmada = 1 estación · solo pedidos pagados, confirmados, no cancelados ni devueltos. Estación 5 ={" "}
          {STATION_5_PERCENT}% OFF; estación 10 = hasta {STATION_10_MAX_PERCENT}% OFF, sujetos a condiciones, límites y margen. Luego se
          reinicia. El descuento se aplica sobre las prendas (no sobre el envío).
        </p>
        <label className={styles.check}>
          <input type="checkbox" name="rewardsEnabled" defaultChecked={settings.rewardsEnabled} />
          Beneficios habilitados en el checkout
        </label>
        <label className={styles.field}>
          Estación 10: % OFF (hasta {STATION_10_MAX_PERCENT})
          <input type="number" name="station10Percent" min="0.01" max={STATION_10_MAX_PERCENT} step="0.01" defaultValue={settings.station10Percent ?? ""} />
        </label>
        <label className={styles.field}>
          Tope por beneficio en $ (opcional)
          <input type="number" name="maxDiscountAmount" min="0.01" step="0.01" defaultValue={settings.maxDiscountAmount ?? ""} />
        </label>
        <label className={styles.field}>
          Condiciones (se muestran en Mi Camino)
          <textarea name="conditions" rows={4} defaultValue={settings.conditions ?? ""} />
        </label>
        <SubmitButton className={styles.button}>Guardar Camino</SubmitButton>
      </form>

      <form action={broadcastAction} className={`${styles.card} ${styles.form}`}>
        <h2>Comunicación a la Familia</h2>
        <p className={styles.muted}>Llega a las notificaciones de MI CASA de todos los miembros (beneficios, invitaciones, prelaunches).</p>
        <label className={styles.field}>
          Título
          <input name="title" required maxLength={140} />
        </label>
        <label className={styles.field}>
          Texto (opcional)
          <textarea name="body" rows={3} />
        </label>
        <label className={styles.field}>
          Link (opcional: /ruta del sitio o https://)
          <input name="link" />
        </label>
        <SubmitButton className={styles.button} confirmText="¿Enviar la comunicación a todos los miembros?">
          Enviar
        </SubmitButton>
      </form>
    </div>
  );
}
