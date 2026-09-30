import type { Metadata } from "next";
import Link from "next/link";
import { FamiliaForm, ProfileFields } from "../FamiliaForm";
import { registerAction } from "../actions";
import styles from "../familia.module.css";

export const metadata: Metadata = {
  title: "Registro — Familia GxK",
};

// Registro opcional (Bible §23).
export default function RegistroPage() {
  return (
    <main className={styles.main}>
      <h1>SUMATE A FAMILIA GxK 🐾</h1>
      <p className={styles.muted}>Registro opcional: comprar no requiere cuenta.</p>
      <FamiliaForm action={registerAction} submitLabel="Registrarme">
        <ProfileFields />
        <label>
          Email
          <input name="email" type="email" inputMode="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
      </FamiliaForm>
      <p>
        ¿Ya sos parte? <Link href="/familia">Ingresar</Link>
      </p>
    </main>
  );
}
