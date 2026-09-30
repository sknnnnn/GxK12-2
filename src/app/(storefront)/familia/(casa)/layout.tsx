import type { ReactNode } from "react";
import { requireMember } from "@/lib/familia/session";
import { countUnreadNotifications } from "@/services/familia";
import { CasaNav } from "../CasaNav";
import styles from "../familia.module.css";

// MI CASA: solo miembros de la Familia con sesión.
export default async function CasaLayout({ children }: { children: ReactNode }) {
  const { supabase } = await requireMember();
  const unread = await countUnreadNotifications(supabase);
  return (
    <main className={styles.main}>
      <p>
        <strong>MI CASA</strong>
      </p>
      <CasaNav unread={unread} />
      {children}
    </main>
  );
}
