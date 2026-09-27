"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import { submitCheckoutAction } from "./actions";
import type { CheckoutIssue, CheckoutOrderSummary } from "@/services/checkout";
import styles from "./page.module.css";

type BuyerForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  locality: string;
  province: string;
  postalCode: string;
};

const EMPTY_FORM: BuyerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  locality: "",
  province: "",
  postalCode: "",
};

const FIELD_LABELS: Record<string, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Email",
  phone: "Teléfono",
  address: "Dirección",
  locality: "Localidad",
  province: "Provincia",
  postalCode: "Código postal",
};

// El carrito (localStorage/Context) solo guarda variantId + nombre para
// mostrar -- se usa acá exclusivamente para poner un nombre legible junto a
// cada error server-side, nunca para calcular montos (eso lo hace siempre
// el servidor, ver services/checkout).
function describeIssue(issue: CheckoutIssue, labelByVariant: Map<string, string>): string {
  switch (issue.type) {
    case "empty_cart":
      return "Tu carrito está vacío.";
    case "invalid_quantity":
      return `La cantidad indicada para "${labelByVariant.get(issue.variantId) ?? "un producto"}" no es válida.`;
    case "variant_not_found":
      return `"${labelByVariant.get(issue.variantId) ?? "Un producto"}" ya no está disponible.`;
    case "insufficient_stock":
      return `No hay stock suficiente de "${labelByVariant.get(issue.variantId) ?? "un producto"}" (disponible: ${issue.available}).`;
    case "missing_field":
      return `Falta completar el campo "${FIELD_LABELS[issue.field] ?? issue.field}".`;
    case "invalid_email":
      return "El email ingresado no es válido.";
    case "stock_changed":
      return "El stock de uno o más productos cambió mientras confirmábamos tu pedido. Revisá tu carrito e intentá de nuevo.";
    case "malformed_request":
    case "order_creation_failed":
      return "No pudimos procesar tu pedido. Probá de nuevo en unos segundos.";
    default:
      return "No pudimos procesar tu pedido. Probá de nuevo en unos segundos.";
  }
}

export default function CheckoutPage() {
  const { lines, clear } = useCart();
  const [form, setForm] = useState<BuyerForm>(EMPTY_FORM);
  const [issues, setIssues] = useState<CheckoutIssue[]>([]);
  const [order, setOrder] = useState<CheckoutOrderSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const labelByVariant = new Map(
    lines.map((line) => [line.variantId, [line.productName, [line.size, line.color].filter(Boolean).join(" / ")].filter(Boolean).join(" — ")]),
  );

  const clientSubtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function updateField(field: keyof BuyerForm) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIssues([]);

    startTransition(async () => {
      try {
        const result = await submitCheckoutAction({
          items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
          },
          shipping: {
            address: form.address,
            locality: form.locality,
            province: form.province,
            postalCode: form.postalCode,
          },
        });

        if (result.ok) {
          setOrder(result.order);
          clear();
        } else {
          setIssues(result.issues);
        }
      } catch {
        setIssues([{ type: "order_creation_failed", message: "unexpected_error" }]);
      }
    });
  }

  if (order) {
    return (
      <main className={styles.main}>
        <div className={styles.confirmation}>
          <h1>¡Pedido confirmado!</h1>
          <p className={styles.confirmationOrderNumber}>{order.orderNumber}</p>

          <ul className={styles.summaryLines}>
            {order.lines.map((line) => (
              <li key={line.variantId} className={styles.summaryLine}>
                <div className={styles.summaryLineInfo}>
                  <span>{line.productName}</span>
                  {line.variantLabel && <span className={styles.summaryLineVariant}>{line.variantLabel}</span>}
                  <span className={styles.summaryLineVariant}>Cantidad: {line.quantity}</span>
                </div>
                <span>{formatPrice(line.lineSubtotal)}</span>
              </li>
            ))}
          </ul>

          <div className={styles.summaryTotals}>
            <div className={styles.summaryTotalRow}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className={styles.summaryTotalRow}>
              <span>Envío</span>
              <span>{formatPrice(order.shippingCost)}</span>
            </div>
            <div className={`${styles.summaryTotalRow} ${styles.summaryGrandTotal}`}>
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <p className={styles.confirmationNote}>
            Tu pedido quedó registrado y el stock reservado por 20 minutos. El paso de pago (Mercado Pago) todavía no
            está disponible en esta etapa -- se incorporará más adelante.
          </p>

          <Link href="/catalogo">Seguir comprando</Link>
        </div>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.empty}>
          <p>Tu carrito está vacío.</p>
          <Link href="/catalogo">Ver catálogo</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>Checkout</h1>
        <Link href="/carrito">Volver al carrito</Link>
      </div>

      <div className={styles.layout}>
        <section className={styles.summary}>
          <h2 className={styles.summaryTitle}>Tu pedido</h2>
          <ul className={styles.summaryLines}>
            {lines.map((line) => {
              const variantLabel = [line.size, line.color].filter(Boolean).join(" / ");
              return (
                <li key={line.variantId} className={styles.summaryLine}>
                  <div className={styles.summaryLineInfo}>
                    <span>{line.productName}</span>
                    {variantLabel && <span className={styles.summaryLineVariant}>{variantLabel}</span>}
                    <span className={styles.summaryLineVariant}>Cantidad: {line.quantity}</span>
                  </div>
                  <span>{formatPrice(line.unitPrice * line.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <div className={styles.summaryTotals}>
            <div className={styles.summaryTotalRow}>
              <span>Subtotal</span>
              <span>{formatPrice(clientSubtotal)}</span>
            </div>
            <div className={`${styles.summaryTotalRow} ${styles.summaryGrandTotal}`}>
              <span>Total</span>
              <span>{formatPrice(clientSubtotal)}</span>
            </div>
          </div>
        </section>

        <form className={styles.form} onSubmit={handleSubmit}>
          {issues.length > 0 && (
            <ul className={styles.errorList}>
              {issues.map((issue, index) => (
                <li key={index}>{describeIssue(issue, labelByVariant)}</li>
              ))}
            </ul>
          )}

          <fieldset className={styles.fieldset}>
            <legend className={styles.fieldsetTitle}>Datos del comprador</legend>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Nombre
                <input type="text" required value={form.firstName} onChange={updateField("firstName")} />
              </label>
              <label className={styles.field}>
                Apellido
                <input type="text" required value={form.lastName} onChange={updateField("lastName")} />
              </label>
              <label className={styles.field}>
                Email
                <input type="email" required value={form.email} onChange={updateField("email")} />
              </label>
              <label className={styles.field}>
                Teléfono
                <input type="tel" required value={form.phone} onChange={updateField("phone")} />
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.fieldsetTitle}>Datos de envío</legend>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Dirección
                <input type="text" required value={form.address} onChange={updateField("address")} />
              </label>
              <label className={styles.field}>
                Localidad
                <input type="text" required value={form.locality} onChange={updateField("locality")} />
              </label>
              <label className={styles.field}>
                Provincia
                <input type="text" required value={form.province} onChange={updateField("province")} />
              </label>
              <label className={styles.field}>
                Código postal
                <input type="text" required value={form.postalCode} onChange={updateField("postalCode")} />
              </label>
            </div>
          </fieldset>

          <button type="submit" className={styles.submitButton} disabled={isPending}>
            {isPending ? "Confirmando..." : "Confirmar pedido"}
          </button>
        </form>
      </div>
    </main>
  );
}
