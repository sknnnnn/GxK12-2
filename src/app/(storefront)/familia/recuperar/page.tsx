import type { Metadata } from "next";
import { FamiliaForm } from "../FamiliaForm";
import { requestRecoveryAction } from "../actions";
import styles from "../familia.module.css";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Familia GxK",
};

export default function RecuperarPage() {
  return (
    <main className={styles.main}>
      <h1>RECUPERAR CONTRASEÑA</h1>
      <FamiliaForm action={requestRecoveryAction} submitLabel="Enviar link">
        <label>
          Email
          <input name="email" type="email" inputMode="email" autoComplete="email" required />
        </label>
      </FamiliaForm>
    </main>
  );
}
