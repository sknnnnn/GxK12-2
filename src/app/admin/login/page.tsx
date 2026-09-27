import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/services/admin";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

// Si ya hay una sesión de admin activa y válida, no tiene sentido mostrar
// el form de login de nuevo -- directo al panel.
export default async function AdminLoginPage() {
  const supabase = await createSupabaseServerClient();
  const admin = await getCurrentAdmin(supabase);

  if (admin) {
    redirect("/admin");
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1>GXK Admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
