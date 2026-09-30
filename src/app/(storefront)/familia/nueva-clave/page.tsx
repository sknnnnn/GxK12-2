import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FamiliaForm } from "../FamiliaForm";
import { newPasswordAction } from "../actions";
import styles from "../familia.module.css";

export const metadata: Metadata = {
  title: "Nueva contraseña — Familia GxK",
};

// Llega acá con la sesión que abre el link de recuperación (/familia/confirmar).
export default async function NuevaClavePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/familia/recuperar");
  return (
    <main className={styles.main}>
      <h1>NUEVA CONTRASEÑA</h1>
      <FamiliaForm action={newPasswordAction} submitLabel="Guardar">
        <label>
          Contraseña nueva
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
      </FamiliaForm>
    </main>
  );
}
