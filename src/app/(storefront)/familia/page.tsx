import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { countUnreadNotifications, getCamino, getCurrentMember } from "@/services/familia";
import { getSiteContent } from "@/services/site";
import { CAMINO_STATIONS } from "@/lib/familia/camino";
import { CasaNav } from "./CasaNav";
import { FamiliaForm, ProfileFields } from "./FamiliaForm";
import { joinFamiliaAction, loginAction, signOutAction } from "./actions";
import styles from "./familia.module.css";

export const metadata: Metadata = {
  title: "Familia GxK — GXK",
};

// FAMILIA GxK 12:2 🐾 (Bible §4, §23). Registro opcional: comprar no
// requiere cuenta. Sin sesión: ingreso y registro. Con sesión: MI CASA.
export default async function FamiliaPage({ searchParams }: PageProps<"/familia">) {
  const { link } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [member, content, userRes] = await Promise.all([
    getCurrentMember(supabase),
    getSiteContent(supabase),
    supabase.auth.getUser(),
  ]);

  if (member) {
    const [camino, unread] = await Promise.all([
      getCamino(createSupabaseAdminClient(), member.userId),
      countUnreadNotifications(supabase),
    ]);
    return (
      <main className={styles.main}>
        <h1>MI CASA</h1>
        <p>Hola, {member.firstName} 🐾</p>
        <CasaNav unread={unread} />
        <section className={styles.card} aria-label="Mi Camino">
          <h2>Mi Camino 🐾</h2>
          <p>
            Estación {camino.position.station} de {CAMINO_STATIONS}
            {camino.position.cycle > 1 ? ` · vuelta ${camino.position.cycle}` : ""}
          </p>
          <Link href="/familia/camino">Ver el Camino G &amp; K</Link>
        </section>
        <form action={signOutAction}>
          <button type="submit" className={styles.secondary}>
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  const user = userRes.data.user;
  return (
    <main className={styles.main}>
      <h1>FAMILIA GxK 12:2 🐾</h1>
      <p>La comunidad precede al cliente.</p>
      {content.membersDescription && <p>{content.membersDescription}</p>}
      <p className={styles.muted}>Registro opcional: comprar no requiere cuenta.</p>
      {link === "invalido" && (
        <p className={styles.error} role="alert">
          El link venció o ya se usó. Pedí uno nuevo.
        </p>
      )}

      {user?.email_confirmed_at ? (
        // Cuenta existente que todavía no es parte de la Familia.
        <section aria-label="Sumarme a la Familia">
          <h2>Sumate a la Familia</h2>
          <FamiliaForm action={joinFamiliaAction} submitLabel="Sumarme">
            <ProfileFields />
          </FamiliaForm>
          <form action={signOutAction}>
            <button type="submit" className={styles.secondary}>
              Cerrar sesión
            </button>
          </form>
        </section>
      ) : (
        <>
          <section aria-label="Ingresar">
            <h2>Ingresar</h2>
            <FamiliaForm action={loginAction} submitLabel="Ingresar">
              <label>
                Email
                <input name="email" type="email" inputMode="email" autoComplete="email" required />
              </label>
              <label>
                Contraseña
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
            </FamiliaForm>
            <p>
              <Link href="/familia/recuperar">Olvidé mi contraseña</Link>
            </p>
          </section>
          <section aria-label="Registro">
            <h2>¿Todavía no sos parte?</h2>
            <Link href="/familia/registro">Sumate a FAMILIA GxK 🐾</Link>
          </section>
        </>
      )}
    </main>
  );
}
