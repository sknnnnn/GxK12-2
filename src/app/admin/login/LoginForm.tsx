"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";
import styles from "./page.module.css";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && <p className={styles.error}>{state.error}</p>}

      <label className={styles.field}>
        Email
        <input type="email" name="email" required autoComplete="username" />
      </label>

      <label className={styles.field}>
        Contraseña
        <input type="password" name="password" required autoComplete="current-password" />
      </label>

      <button type="submit" className={styles.submitButton} disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
