// WhatsApp contextual (Bible §22): complementa el ecommerce, no lo reemplaza.
// Formato de consulta de la Bible:
//   "Hola 🐾 Tengo una duda sobre Satoru, color negro, talle M."

export function buildWhatsAppHref(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productInquiryMessage(input: { productName: string; color?: string | null; size?: string | null }): string {
  const parts = [`Hola 🐾 Tengo una duda sobre ${input.productName}`];
  if (input.color) parts.push(`color ${input.color.toLowerCase()}`);
  if (input.size) parts.push(`talle ${input.size}`);
  return `${parts.join(", ")}.`;
}

/** Consulta general (sin producto), ej. dudas de talles o desde Help. */
export const GENERAL_INQUIRY_MESSAGE = "Hola 🐾 Tengo una duda.";
