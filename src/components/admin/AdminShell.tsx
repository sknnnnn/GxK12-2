import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import type { AdminProfile } from "@/services/admin";
import { AdminNav } from "./AdminNav";
import styles from "./AdminShell.module.css";

/**
 * Estructura reutilizable de Admin Web (sidebar + header + contenido).
 * Server Component: no tiene estado propio ni lógica de negocio -- solo
 * arma el layout y delega logout a una Server Action existente
 * (src/app/admin/actions.ts). El chequeo de autorización real ya se hizo en
 * el layout que envuelve esto (src/app/admin/(protected)/layout.tsx); acá
 * solo se recibe el admin ya resuelto para mostrarlo.
 */
export function AdminShell({ admin, children }: { admin: AdminProfile; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>GXK Admin</div>
        <AdminNav />
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <span className={styles.adminName}>{admin.fullName ?? admin.email}</span>
          <form action={signOutAction}>
            <button type="submit" className={styles.logoutButton}>
              Cerrar sesión
            </button>
          </form>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
