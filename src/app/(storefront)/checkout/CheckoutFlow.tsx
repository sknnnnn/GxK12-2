"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/format";
import type { CheckoutAddressInput, CheckoutCustomerInput, CheckoutIssue } from "@/services/checkout";
import type { DeliveryMethod, DeliveryMethodId } from "@/services/shipping/delivery";
import type { PaymentOption } from "@/services/payments/settings";
import { submitCheckoutAction } from "./actions";
import styles from "./page.module.css";

const STEPS = ["Datos", "Entrega", "Pago", "Confirmación"] as const;

const EMPTY_CUSTOMER: CheckoutCustomerInput = { firstName: "", lastName: "", email: "", phone: "" };
const EMPTY_ADDRESS: CheckoutAddressInput = {
  streetName: "",
  streetNumber: "",
  floor: "",
  apartment: "",
  locality: "",
  province: "",
  postalCode: "",
};

const FIELD_LABELS: Record<string, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Email",
  phone: "Teléfono",
  streetName: "Calle",
  streetNumber: "Número",
  floor: "Piso",
  apartment: "Depto.",
  locality: "Localidad",
  province: "Provincia",
  postalCode: "Código postal",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describeIssue(issue: CheckoutIssue): string {
  switch (issue.type) {
    case "empty_cart":
      return "Tu carrito está vacío.";
    case "missing_field":
      return `Falta completar: ${FIELD_LABELS[issue.field] ?? issue.field}.`;
    case "invalid_email":
      return "El email no es válido.";
    case "invalid_quantity":
      return "Hay una cantidad inválida en el carrito.";
    case "variant_not_found":
      return "Un producto del carrito ya no está disponible.";
    case "insufficient_stock":
      return issue.available > 0
        ? `No hay stock suficiente de un producto (quedan ${issue.available}).`
        : "Un producto del carrito se agotó.";
    case "stock_changed":
      return "El stock cambió mientras comprabas. Revisá el carrito y volvé a intentar.";
    case "delivery_unavailable":
      return "La modalidad de entrega elegida ya no está disponible.";
    case "payment_unavailable":
      return "El medio de pago elegido no está disponible para esa entrega.";
    case "malformed_request":
      return "No pudimos procesar el pedido. Volvé a intentar.";
    case "order_creation_failed":
      return "No pudimos crear el pedido. Volvé a intentar en un momento.";
  }
}

function issueStep(issue: CheckoutIssue): number {
  if (issue.type === "missing_field") return issue.field in EMPTY_CUSTOMER ? 0 : 1;
  if (issue.type === "invalid_email") return 0;
  if (issue.type === "delivery_unavailable") return 1;
  return 2;
}

export function CheckoutFlow({
  delivery,
  paymentOptionsByDelivery,
}: {
  delivery: (DeliveryMethod & { cost: number })[];
  paymentOptionsByDelivery: Record<DeliveryMethodId, PaymentOption[]>;
}) {
  const router = useRouter();
  const { lines, subtotal, hydrated, clear } = useCart();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [deliveryId, setDeliveryId] = useState<DeliveryMethodId | null>(delivery.length === 1 ? delivery[0].id : null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <p className={styles.muted}>Pedido creado. Te llevamos a la confirmación…</p>;
  if (!hydrated) return <p className={styles.muted}>Cargando…</p>;
  if (lines.length === 0) {
    return (
      <div className={styles.muted}>
        <p>Tu carrito está vacío.</p>
        <Link href="/catalogo">Ir a la tienda</Link>
      </div>
    );
  }
  if (delivery.length === 0) {
    return <p className={styles.muted}>Todavía no hay modalidades de entrega habilitadas. Volvé a intentar más tarde.</p>;
  }

  const selectedDelivery = delivery.find((method) => method.id === deliveryId) ?? null;
  const paymentOptions = selectedDelivery ? paymentOptionsByDelivery[selectedDelivery.id] ?? [] : [];
  const selectedPayment = paymentOptions.find((option) => option.id === paymentId) ?? null;
  const isCarrier = selectedDelivery !== null && selectedDelivery.id !== "meeting_point";
  const total = subtotal + (selectedDelivery?.cost ?? 0);
  const payNow = selectedPayment
    ? selectedPayment.onlineShare === 0.5
      ? Math.round(total * 50) / 100
      : total * selectedPayment.onlineShare
    : total;

  function goNext(event: FormEvent) {
    event.preventDefault();
    const found: string[] = [];
    if (step === 0) {
      for (const key of Object.keys(EMPTY_CUSTOMER) as (keyof CheckoutCustomerInput)[]) {
        if (!customer[key].trim()) found.push(`Falta completar: ${FIELD_LABELS[key]}.`);
      }
      if (customer.email.trim() && !EMAIL_PATTERN.test(customer.email.trim())) found.push("El email no es válido.");
    }
    if (step === 1) {
      if (!selectedDelivery) found.push("Elegí una modalidad de entrega.");
      if (isCarrier) {
        for (const key of ["streetName", "streetNumber", "locality", "province", "postalCode"] as const) {
          if (!address[key].trim()) found.push(`Falta completar: ${FIELD_LABELS[key]}.`);
        }
      }
      if (selectedDelivery && !paymentOptionsByDelivery[selectedDelivery.id]?.some((o) => o.id === paymentId)) setPaymentId(null);
    }
    setErrors(found);
    if (found.length === 0) setStep(step + 1);
  }

  async function confirmOrder(event: FormEvent) {
    event.preventDefault();
    if (!selectedDelivery || !selectedPayment) {
      setErrors(["Elegí un medio de pago."]);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      const result = await submitCheckoutAction({
        items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        customer,
        deliveryMethod: selectedDelivery.id,
        address: isCarrier ? address : null,
        paymentOption: selectedPayment.id,
      });
      if (!result.ok) {
        setErrors(result.issues.map(describeIssue));
        setStep(Math.min(...result.issues.map(issueStep)));
        setSubmitting(false);
        return;
      }
      setDone(true);
      clear();
      if (result.order.payment.status === "redirect") {
        window.location.assign(result.order.payment.initPoint);
        return;
      }
      router.push(`/checkout/retorno?token=${encodeURIComponent(result.order.lookupToken)}`);
    } catch {
      setErrors(["No pudimos procesar el pedido. Volvé a intentar."]);
      setSubmitting(false);
    }
  }

  const field = <K extends string>(
    key: K,
    value: string,
    onChange: (value: string) => void,
    props: { type?: string; autoComplete?: string; required?: boolean; inputMode?: "numeric" | "tel" | "email" } = {},
  ) => (
    <label className={styles.field} key={key}>
      {FIELD_LABELS[key]}
      {props.required === false ? " (opcional)" : ""}
      <input
        type={props.type ?? "text"}
        value={value}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  return (
    <div className={styles.flow}>
      <ol className={styles.steps} aria-label="Pasos del checkout">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? styles.stepCurrent : index < step ? styles.stepDone : styles.step} aria-current={index === step ? "step" : undefined}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <ul className={styles.errors} role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {step === 0 && (
        <form onSubmit={goNext} className={styles.form} noValidate>
          <h2>Datos</h2>
          <p className={styles.muted}>Comprar no requiere cuenta.</p>
          {field("firstName", customer.firstName, (v) => setCustomer({ ...customer, firstName: v }), { autoComplete: "given-name" })}
          {field("lastName", customer.lastName, (v) => setCustomer({ ...customer, lastName: v }), { autoComplete: "family-name" })}
          {field("email", customer.email, (v) => setCustomer({ ...customer, email: v }), { type: "email", autoComplete: "email", inputMode: "email" })}
          {field("phone", customer.phone, (v) => setCustomer({ ...customer, phone: v }), { type: "tel", autoComplete: "tel", inputMode: "tel" })}
          <button type="submit" className={styles.primary}>
            Continuar
          </button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={goNext} className={styles.form} noValidate>
          <h2>Entrega</h2>
          <fieldset className={styles.options}>
            <legend className={styles.srOnly}>Modalidad de entrega</legend>
            {delivery.map((method) => (
              <label key={method.id} className={styles.option}>
                <input type="radio" name="delivery" checked={deliveryId === method.id} onChange={() => setDeliveryId(method.id)} />
                <span>
                  <strong>{method.label}</strong> — {method.cost === 0 ? "sin costo" : formatPrice(method.cost)}
                  {method.id === "meeting_point" && method.details && <span className={styles.details}>{method.details}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          {isCarrier && (
            <div className={styles.address}>
              {field("streetName", address.streetName, (v) => setAddress({ ...address, streetName: v }), { autoComplete: "address-line1" })}
              {field("streetNumber", address.streetNumber, (v) => setAddress({ ...address, streetNumber: v }), { inputMode: "numeric" })}
              {field("floor", address.floor, (v) => setAddress({ ...address, floor: v }), { required: false })}
              {field("apartment", address.apartment, (v) => setAddress({ ...address, apartment: v }), { required: false })}
              {field("locality", address.locality, (v) => setAddress({ ...address, locality: v }), { autoComplete: "address-level2" })}
              {field("province", address.province, (v) => setAddress({ ...address, province: v }), { autoComplete: "address-level1" })}
              {field("postalCode", address.postalCode, (v) => setAddress({ ...address, postalCode: v }), { autoComplete: "postal-code" })}
            </div>
          )}
          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(0)}>
              Volver
            </button>
            <button type="submit" className={styles.primary}>
              Continuar
            </button>
          </div>
        </form>
      )}

      {step >= 2 && (
        <form onSubmit={confirmOrder} className={styles.form} noValidate>
          <h2>Pago</h2>
          {paymentOptions.length === 0 ? (
            <p className={styles.muted}>No hay medios de pago habilitados para esta entrega.</p>
          ) : (
            <fieldset className={styles.options}>
              <legend className={styles.srOnly}>Medio de pago</legend>
              {paymentOptions.map((option) => (
                <label key={option.id} className={styles.option}>
                  <input type="radio" name="payment" checked={paymentId === option.id} onChange={() => setPaymentId(option.id)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          )}

          <section className={styles.summary} aria-label="Resumen del pedido">
            <ul>
              {lines.map((line) => (
                <li key={line.variantId}>
                  <span>
                    {line.productName}
                    {line.size || line.color ? ` (${[line.size, line.color].filter(Boolean).join(" / ")})` : ""} × {line.quantity}
                  </span>
                  <span>{formatPrice(line.unitPrice * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.row}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.row}>
              <span>{selectedDelivery?.label}</span>
              <span>{formatPrice(selectedDelivery?.cost ?? 0)}</span>
            </div>
            <div className={styles.rowTotal}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {selectedPayment && selectedPayment.onlineShare < 1 && (
              <>
                <div className={styles.row}>
                  <span>Pagás ahora</span>
                  <span>{formatPrice(payNow)}</span>
                </div>
                <div className={styles.row}>
                  <span>Pagás en la entrega</span>
                  <span>{formatPrice(total - payNow)}</span>
                </div>
              </>
            )}
            <p className={styles.muted}>Precio y stock se confirman al crear el pedido. El pedido se confirma con el pago.</p>
          </section>

          <div className={styles.actions}>
            <button type="button" onClick={() => setStep(1)} disabled={submitting}>
              Volver
            </button>
            <button type="submit" className={styles.primary} disabled={submitting || !selectedPayment}>
              {submitting ? "Procesando…" : "Confirmar pedido"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
