// Texto de las notificaciones de miembros (Roadmap Bloque 6). La base guarda
// el tipo y los datos; el texto se arma acá.
import { orderStatusLabel } from "@/lib/orders/status";
import type { MemberNotification } from "@/services/familia";

export function describeNotification(notification: Pick<MemberNotification, "kind" | "payload" | "title" | "body" | "link">): {
  title: string;
  body: string | null;
  href: string | null;
} {
  const payload = notification.payload;
  switch (notification.kind) {
    case "order_status": {
      const orderNumber = String(payload.order_number ?? "");
      return {
        title: `Pedido ${orderNumber}: ${orderStatusLabel(String(payload.status ?? ""))}`,
        body: null,
        href: orderNumber ? `/familia/pedidos/${orderNumber}` : null,
      };
    }
    case "camino":
      return {
        title: `Mi Camino 🐾: llegaste a la estación ${String(payload.station ?? "")}`,
        body: "Tenés un beneficio del Camino G & K.",
        href: "/familia/camino",
      };
    case "broadcast":
      return {
        title: notification.title ?? "Familia GxK",
        body: notification.body,
        href: notification.link && /^(\/|https:\/\/)/.test(notification.link) ? notification.link : null,
      };
  }
}
