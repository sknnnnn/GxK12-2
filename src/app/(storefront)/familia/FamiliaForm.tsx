"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "./actions";
import styles from "./familia.module.css";

/** Formulario de Familia sobre una Server Action con estado (error/mensaje). */
export function FamiliaForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={styles.form}>
      {children}
      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className={styles.success} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}

export function ProfileFields({ defaults }: { defaults?: { firstName: string; lastName: string; phone: string } }) {
  return (
    <>
      <label>
        Nombre
        <input name="firstName" autoComplete="given-name" defaultValue={defaults?.firstName} required />
      </label>
      <label>
        Apellido
        <input name="lastName" autoComplete="family-name" defaultValue={defaults?.lastName} required />
      </label>
      <label>
        Teléfono (opcional)
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={defaults?.phone} />
      </label>
    </>
  );
}
