"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";

/** Link al carrito con el conteo de ítems actual. Cliente: necesita el contexto. */
export function CartLink() {
  const { itemCount } = useCart();
  return <Link href="/carrito">Carrito{itemCount > 0 ? ` (${itemCount})` : ""}</Link>;
}
