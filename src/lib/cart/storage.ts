import type { CartLine } from "./types";

// Versión en la key: si el shape de CartLine cambia de forma incompatible,
// basta con subir esta versión para que carritos viejos en el navegador de
// un usuario se ignoren en vez de romper la app.
const STORAGE_KEY = "gxk:cart:v1";

function isValidCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.variantId === "string" &&
    typeof line.productId === "string" &&
    typeof line.productSlug === "string" &&
    typeof line.productName === "string" &&
    (line.size === null || typeof line.size === "string") &&
    (line.color === null || typeof line.color === "string") &&
    (line.sku === null || typeof line.sku === "string") &&
    typeof line.unitPrice === "number" &&
    (line.imageUrl === null || typeof line.imageUrl === "string") &&
    typeof line.quantity === "number" &&
    line.quantity > 0
  );
}

/**
 * Lee el carrito persistido. Nunca lanza: ante cualquier dato corrupto,
 * inaccesible (localStorage deshabilitado, modo privado) o de una versión
 * de shape distinta, devuelve un carrito vacío en vez de romper la app.
 */
export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartLine);
  } catch {
    return [];
  }
}

/**
 * Persiste el carrito. Nunca lanza: si localStorage no está disponible o
 * la cuota está excedida, el carrito sigue funcionando en memoria para la
 * sesión actual, simplemente no sobrevive un refresh.
 */
export function saveCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Ver comentario de la función.
  }
}
