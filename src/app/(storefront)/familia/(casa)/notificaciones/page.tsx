import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/familia/session";
import { getMemberNotifications } from "@/services/familia";
import { describeNotification } from "@/lib/familia/notifications";
import { formatDateTimeAR } from "@/lib/datetime";
import { markNotificationsReadAction } from "../../actions";
import styles from "../../familia.module.css";

export const metadata: Metadata = {
  title: "Notificaciones — Familia GxK",
};

export default async function NotificacionesPage() {
  const { supabase } = await requireMember();
  const notifications = await getMemberNotifications(supabase);
  const hasUnread = notifications.some((notification) => !notification.read);
  return (
    <>
      <h1>NOTIFICACIONES</h1>
      {hasUnread && (
        <form action={markNotificationsReadAction}>
          <button type="submit" className={styles.secondary}>
            Marcar todo como leído
          </button>
        </form>
      )}
      {notifications.length === 0 ? (
        <p className={styles.muted}>No tenés notificaciones.</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => {
            const view = describeNotification(notification);
            return (
              <li key={notification.id} className={notification.read ? styles.card : `${styles.card} ${styles.unread}`}>
                <span>{view.title}</span>
                {view.body && <span className={styles.muted}>{view.body}</span>}
                {view.href && <Link href={view.href}>Ver</Link>}
                <span className={styles.muted}>{formatDateTimeAR(notification.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
