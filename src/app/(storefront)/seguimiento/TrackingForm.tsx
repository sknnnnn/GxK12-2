"use client";

import { useActionState } from "react";
import { OrderStatusPanel } from "@/components/storefront/orders/OrderStatusPanel";
import { trackOrderAction, type TrackingLookupState } from "./actions";
import styles from "./page.module.css";

export function TrackingForm({ defaultOrderNumber }: { defaultOrderNumber: string }) {
  const [state, action, pending] = useActionState<TrackingLookupState, FormData>(trackOrderAction, { status: "idle" });

  return (
    <>
      <form action={action} className={styles.form}>
        <label>
          Número de pedido
          <input name="pedido" defaultValue={defaultOrderNumber} placeholder="GXK-000001" required autoComplete="off" />
        </label>
        <label>
          Email de la compra
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Buscando…" : "Ver estado"}
        </button>
      </form>
      {state.status === "not_found" && <p role="alert">No encontramos un pedido con esos datos.</p>}
      {state.status === "found" && <OrderStatusPanel order={state.order} />}
    </>
  );
}
